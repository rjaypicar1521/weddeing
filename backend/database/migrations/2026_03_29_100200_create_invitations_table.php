<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('slug')->unique();
            $table->string('guest_code', 6)->unique();
            $table->string('status')->default('draft');

            $table->string('partner1_name')->nullable();
            $table->string('partner2_name')->nullable();
            $table->date('wedding_date')->nullable();
            $table->time('wedding_time')->nullable();
            $table->string('venue_name')->nullable();
            $table->string('venue_address')->nullable();
            $table->decimal('venue_lat', 10, 7)->nullable();
            $table->decimal('venue_lng', 10, 7)->nullable();

            $table->string('dress_code')->nullable();
            $table->json('dress_code_colors')->nullable();
            $table->foreignId('template_id')->nullable()->constrained('invitation_templates')->nullOnDelete();
            $table->json('color_palette')->nullable();
            $table->string('music_url')->nullable();
            $table->string('prenup_video_url')->nullable();
            $table->string('bank_qr_path')->nullable();
            $table->json('schedule')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->unique('user_id');
            $table->index('status');
            $table->index('published_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invitations');
    }
};
