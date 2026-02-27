<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcademicTerm;
use App\Models\ExtracurricularActivity;
use App\Models\StudentActivity;
use App\Models\StudentTermBalance;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class FeeSummaryController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $terms = AcademicTerm::query()
            ->orderByDesc('is_active')
            ->orderByDesc('academic_year')
            ->orderBy('term_number')
            ->get(['id', 'name', 'term_number', 'academic_year', 'is_active']);

        $termId = $request->query('term_id') ? (int) $request->query('term_id') : ($terms->firstWhere('is_active', true)?->id ?? $terms->first()?->id);

        $students = User::role('student')
            ->with(['schoolClass:id,name,base_fee,uniform_fee'])
            ->orderBy('name')
            ->get(['id', 'name', 'class_id', 'transport_fee']);

        $term = AcademicTerm::find($termId);

        $termBalances = $term
            ? StudentTermBalance::where('academic_term_id', $term->id)->get()->keyBy('user_id')
            : collect();

        $activityPrices = ExtracurricularActivity::all(['id', 'price'])->keyBy('id');

        $studentActivityIds = $term
            ? StudentActivity::where('academic_term_id', $term->id)
                ->where('is_enrolled', true)
                ->get(['user_id', 'extracurricular_activity_id'])
            : collect();

        $extraActivityTotals = [];
        foreach ($studentActivityIds as $sa) {
            $price = (float) ($activityPrices->get($sa->extracurricular_activity_id)?->price ?? 0);
            $extraActivityTotals[$sa->user_id] = ($extraActivityTotals[$sa->user_id] ?? 0) + $price;
        }

        $summary = $students->map(function (User $user) use ($termBalances, $extraActivityTotals) {
            $class = $user->schoolClass;
            $baseFee = (float) ($class?->base_fee ?? 0);
            $uniformFee = (float) ($class?->uniform_fee ?? 0);
            $transportFee = (float) ($user->transport_fee ?? 0);
            $extraActivityTotal = (float) ($extraActivityTotals[$user->id] ?? 0);

            $totalFeeThisTerm = $baseFee + $uniformFee + $transportFee + $extraActivityTotal;

            $balance = $termBalances->get($user->id);
            $debitBalance = (float) ($balance?->debit_balance ?? 0);
            $creditBalance = (float) ($balance?->credit_balance ?? 0);
            $amountPaid = (float) ($balance?->amount_paid ?? 0);

            $grossBeforePayment = $totalFeeThisTerm + $debitBalance - $creditBalance;
            $closingBalance = $grossBeforePayment - $amountPaid;

            return [
                'student_name' => $user->name,
                'class' => $class?->name ?? '—',
                'debit_balance' => round($debitBalance, 2),
                'credit_balance' => round($creditBalance, 2),
                'base_fee' => round($baseFee, 2),
                'uniform_fee' => round($uniformFee, 2),
                'transport_fee' => round($transportFee, 2),
                'extra_activity_total' => round($extraActivityTotal, 2),
                'total_fee_this_term' => round($totalFeeThisTerm, 2),
                'amount_paid' => round($amountPaid, 2),
                'closing_balance' => round($closingBalance, 2),
            ];
        });

        return Inertia::render('admin/fees/summary', [
            'terms' => $terms,
            'selectedTermId' => $termId,
            'summary' => $summary->values()->all(),
        ]);
    }
}
