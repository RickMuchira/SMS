<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchoolClass;
use App\Models\User;
use App\Services\EmailGeneratorService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class AdminFeeCreateStudentsController extends Controller
{
    /**
     * Create students from the fee-import approval list (students not found during import).
     */
    public function __invoke(Request $request): Response
    {
        $validated = $request->validate([
            'students' => ['required', 'array', 'min:1'],
            'students.*.name' => ['required', 'string', 'max:255'],
            'students.*.class' => ['required', 'string', 'max:255'],
        ]);

        $created = [];

        foreach ($validated['students'] as $item) {
            $name = trim($item['name']);
            $className = trim($item['class']);

            if ($name === '' || $className === '') {
                continue;
            }

            $class = SchoolClass::where('name', $className)->first();
            if (! $class) {
                continue;
            }

            $existing = User::where('name', $name)->where('class_id', $class->id)->role('student')->first();
            if ($existing) {
                continue;
            }

            $email = EmailGeneratorService::generateFromName($name);
            $password = 'Imported1!';

            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => Hash::make($password),
                'class_id' => $class->id,
            ]);

            $studentRole = Role::where('name', 'student')->first();
            if ($studentRole !== null) {
                $user->assignRole($studentRole);
            }

            $created[] = [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'class' => $className,
            ];
        }

        return response(['created' => $created], Response::HTTP_CREATED);
    }
}
