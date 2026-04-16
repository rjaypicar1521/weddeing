<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rsvps', function (Blueprint $table): void {
            $table->foreignId('guest_group_id')->nullable()->after('invitation_id')->constrained('guest_groups')->nullOnDelete();
        });

        $defaultGroupIds = DB::table('guest_groups')
            ->where('is_default', true)
            ->pluck('id', 'invitation_id');

        foreach ($defaultGroupIds as $invitationId => $groupId) {
            DB::table('rsvps')
                ->where('invitation_id', $invitationId)
                ->update(['guest_group_id' => $groupId]);
        }
    }

    public function down(): void
    {
        Schema::table('rsvps', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('guest_group_id');
        });
    }
};
