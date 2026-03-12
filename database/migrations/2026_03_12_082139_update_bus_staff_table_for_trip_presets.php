<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bus_staff', function (Blueprint $table): void {
            if (! Schema::hasColumn('bus_staff', 'bus_id')) {
                $table->foreignId('bus_id')->nullable()->after('id')->constrained('buses')->nullOnDelete();
            }

            if (! Schema::hasColumn('bus_staff', 'type')) {
                $table->enum('type', ['morning', 'evening'])->nullable()->after('bus_id');
            }

            if (! Schema::hasColumn('bus_staff', 'trip_number')) {
                $table->unsignedInteger('trip_number')->nullable()->after('type');
            }

            if (! Schema::hasColumn('bus_staff', 'driver_id')) {
                $table->foreignId('driver_id')->nullable()->after('trip_number')->constrained('users')->nullOnDelete();
            }

            if (! Schema::hasColumn('bus_staff', 'assistant_id')) {
                $table->foreignId('assistant_id')->nullable()->after('driver_id')->constrained('users')->nullOnDelete();
            }
        });

        if (! Schema::hasColumn('bus_staff', 'type') || ! Schema::hasColumn('bus_staff', 'trip_number') || ! Schema::hasColumn('bus_staff', 'bus_id')) {
            return;
        }

        Schema::table('bus_staff', function (Blueprint $table): void {
            $table->unique(['bus_id', 'type', 'trip_number'], 'bus_staff_bus_type_trip_unique');
        });
    }

    public function down(): void
    {
        Schema::table('bus_staff', function (Blueprint $table): void {
            if (Schema::hasColumn('bus_staff', 'assistant_id')) {
                $table->dropConstrainedForeignId('assistant_id');
            }
            if (Schema::hasColumn('bus_staff', 'driver_id')) {
                $table->dropConstrainedForeignId('driver_id');
            }
            if (Schema::hasColumn('bus_staff', 'bus_id')) {
                $table->dropConstrainedForeignId('bus_id');
            }

            if (Schema::hasColumn('bus_staff', 'type')) {
                $table->dropColumn('type');
            }
            if (Schema::hasColumn('bus_staff', 'trip_number')) {
                $table->dropColumn('trip_number');
            }

            $table->dropUnique('bus_staff_bus_type_trip_unique');
        });
    }
};
