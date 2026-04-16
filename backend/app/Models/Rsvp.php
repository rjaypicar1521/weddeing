<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Rsvp extends Model
{
    use HasFactory;
    use SoftDeletes;

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'invitation_id',
        'guest_group_id',
        'guest_name',
        'email',
        'guest_status',
        'invited_at',
        'attending',
        'plus_one_name',
        'meal_preference',
        'transport',
        'favorite_memory',
        'message_to_couple',
        'confirmation_code',
        'guest_token_hash',
        'ip_address',
        'submitted_at',
        'manually_overridden_at',
        'manually_overridden_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'attending' => 'boolean',
            'submitted_at' => 'datetime',
            'invited_at' => 'datetime',
            'manually_overridden_at' => 'datetime',
        ];
    }

    public function invitation(): BelongsTo
    {
        return $this->belongsTo(Invitation::class);
    }

    public function guestGroup(): BelongsTo
    {
        return $this->belongsTo(GuestGroup::class);
    }

    public function notes(): HasMany
    {
        return $this->hasMany(RsvpNote::class)->latest('created_at');
    }

    public function audits(): HasMany
    {
        return $this->hasMany(RsvpAudit::class)->latest('created_at');
    }

    public function reminders(): HasMany
    {
        return $this->hasMany(AdminReminder::class)->latest('created_at');
    }
}
