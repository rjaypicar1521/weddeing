<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('user_name');
            $table->string('action', 64);
            $table->string('category', 32)->default('all');
            $table->string('details', 500)->nullable();
            $table->string('ip', 45)->nullable();
            $table->timestamps();

            $table->index(['action', 'created_at']);
            $table->index(['category', 'created_at']);
            $table->index('user_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
