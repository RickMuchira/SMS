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
        Schema::create('staff_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('employee_id')->unique();

            // Personal Information
            $table->string('national_id_number')->nullable()->unique();
            $table->date('date_of_birth')->nullable();
            $table->enum('gender', ['male', 'female', 'other'])->nullable();
            $table->string('phone_number')->nullable();
            $table->string('personal_email')->nullable();
            $table->text('home_address')->nullable();
            $table->string('next_of_kin_name')->nullable();
            $table->string('next_of_kin_relationship')->nullable();
            $table->string('next_of_kin_phone')->nullable();
            $table->string('profile_photo')->nullable();

            // Employment Information
            $table->string('job_title')->nullable();
            $table->foreignId('department_id')->nullable()->constrained('staff_departments')->onDelete('set null');
            $table->enum('employment_type', ['full-time', 'part-time', 'contract'])->default('full-time');
            $table->date('date_of_joining')->nullable();
            $table->enum('employment_status', ['active', 'suspended', 'terminated'])->default('active');

            // Statutory Numbers
            $table->string('tsc_number')->nullable();
            $table->string('kra_pin')->nullable();
            $table->string('nssf_number')->nullable();
            $table->string('sha_shif_number')->nullable();

            // Bank Information
            $table->string('bank_name')->nullable();
            $table->string('bank_account_number')->nullable();
            $table->string('bank_branch')->nullable();

            // Salary Information
            $table->decimal('gross_monthly_salary', 12, 2)->default(0);
            $table->json('allowances')->nullable();
            $table->json('custom_deductions')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('staff_profiles');
    }
};
