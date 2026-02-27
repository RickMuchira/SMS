<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_fees', function (Blueprint $table) {
            if (! Schema::hasColumn('student_fees', 'academic_term_id')) {
                $table->foreignId('academic_term_id')->after('fee_structure_id')->nullable()->constrained('academic_terms')->onDelete('cascade');
            }
            if (! Schema::hasColumn('student_fees', 'previous_balance')) {
                $table->decimal('previous_balance', 10, 2)->default(0)->after('amount');
            }
            if (! Schema::hasColumn('student_fees', 'credit_balance')) {
                $table->decimal('credit_balance', 10, 2)->default(0)->after('previous_balance');
            }
        });

        // Dropping indexed columns on SQLite can cause issues in tests because
        // SQLite does not fully support altering tables with existing indexes.
        // In that environment we keep the legacy columns; in MySQL/PostgreSQL
        // we can safely drop them.
        if (Schema::getConnection()->getDriverName() !== 'sqlite') {
            Schema::table('student_fees', function (Blueprint $table) {
                if (Schema::hasColumn('student_fees', 'term')) {
                    $table->dropColumn('term');
                }
                if (Schema::hasColumn('student_fees', 'academic_year')) {
                    $table->dropColumn('academic_year');
                }
            });
        }
    }

    public function down(): void
    {
        Schema::table('student_fees', function (Blueprint $table) {
            if (Schema::hasColumn('student_fees', 'academic_term_id')) {
                $table->dropForeign(['academic_term_id']);
                $table->dropColumn('academic_term_id');
            }
            if (Schema::hasColumn('student_fees', 'previous_balance')) {
                $table->dropColumn('previous_balance');
            }
            if (Schema::hasColumn('student_fees', 'credit_balance')) {
                $table->dropColumn('credit_balance');
            }

            if (! Schema::hasColumn('student_fees', 'term')) {
                $table->string('term')->nullable();
            }
            if (! Schema::hasColumn('student_fees', 'academic_year')) {
                $table->string('academic_year')->nullable();
            }
        });
    }
};
