<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invitations', function (Blueprint $table): void {
            $table->string('custom_domain')->nullable()->after('guest_limit');
            $table->string('custom_domain_status')->default('pending')->after('custom_domain');
            $table->timestamp('custom_domain_verified_at')->nullable()->after('custom_domain_status');

            $table->index('custom_domain');
            $table->index('custom_domain_status');
        });
    }

    public function down(): void
    {
        Schema::table('invitations', function (Blueprint $table): void {
            $table->dropIndex(['custom_domain']);
            $table->dropIndex(['custom_domain_status']);
            $table->dropColumn([
                'custom_domain',
                'custom_domain_status',
                'custom_domain_verified_at',
            ]);
        });
    }
};

