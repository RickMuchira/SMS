<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_transport', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->onDelete('cascade');
            $table->boolean('uses_transport')->default(true);
            $table->foreignId('morning_trip_id')->nullable()->constrained('trips')->onDelete('set null');
            $table->foreignId('evening_trip_id')->nullable()->constrained('trips')->onDelete('set null');
            $table->foreignId('pickup_location_id')->nullable()->constrained('locations')->onDelete('set null');
            $table->foreignId('dropoff_location_id')->nullable()->constrained('locations')->onDelete('set null');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_transport');
    }
};
