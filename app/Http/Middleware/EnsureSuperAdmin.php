<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSuperAdmin
{
    /**
     * Only allow super@gmail.com to perform super admin actions.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->email !== 'super@gmail.com') {
            abort(403, 'Only the primary super administrator can perform this action.');
        }

        return $next($request);
    }
}
