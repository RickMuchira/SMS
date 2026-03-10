<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('payroll_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_profile_id')->constrained('staff_profiles')->onDelete('cascade');
            $table->integer('year');
            $table->integer('month');

            // Salary Components
            $table->decimal('gross_salary', 12, 2);
            $table->json('allowances')->nullable();
            $table->decimal('total_allowances', 12, 2)->default(0);

            // Statutory Deductions
            $table->decimal('nssf_employee', 12, 2)->default(0);
            $table->decimal('nssf_employer', 12, 2)->default(0);
            $table->decimal('shif', 12, 2)->default(0);
            $table->decimal('ahl_employee', 12, 2)->default(0);
            $table->decimal('ahl_employer', 12, 2)->default(0);
            $table->decimal('paye', 12, 2)->default(0);

            // Custom Deductions
            $table->json('custom_deductions')->nullable();
            $table->decimal('total_custom_deductions', 12, 2)->default(0);

            // Totals
            $table->decimal('total_deductions', 12, 2)->default(0);
            $table->decimal('net_salary', 12, 2);

            // Metadata
            $table->enum('status', ['draft', 'approved', 'paid'])->default('draft');
            $table->date('payment_date')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();
            $table->unique(['staff_profile_id', 'year', 'month']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payroll_records');
    }
};
