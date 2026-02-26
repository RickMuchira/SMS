<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('locations', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // "Karen Estate", "John Doe's Home"
            $table->text('description')->nullable();
            $table->decimal('latitude', 10, 8); // GPS coordinate
            $table->decimal('longitude', 11, 8); // GPS coordinate
            $table->text('address')->nullable();
            $table->enum('location_type', ['pickup', 'dropoff', 'both'])->default('both');
            $table->foreignId('student_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->integer('order_sequence')->default(0); // Route order
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->boolean('is_verified')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('locations');
    }
};
