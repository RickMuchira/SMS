<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bus_staff', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('bus_id')->constrained('buses')->onDelete('cascade');
            $table->enum('type', ['morning', 'evening']);
            $table->unsignedInteger('trip_number');
            $table->foreignId('driver_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('assistant_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['bus_id', 'type', 'trip_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bus_staff');
    }
};
