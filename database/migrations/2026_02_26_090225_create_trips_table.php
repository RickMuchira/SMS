<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trips', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // "Morning Trip 1", "Evening Trip 2"
            $table->enum('type', ['morning', 'evening']);
            $table->integer('trip_number');
            $table->foreignId('driver_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('assistant_id')->nullable()->constrained('users')->onDelete('set null');
            $table->time('departure_time')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trips');
    }
};
