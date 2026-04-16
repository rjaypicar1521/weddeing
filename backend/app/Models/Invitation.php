<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

class Invitation extends Model
{
    use HasFactory;

    protected static function booted(): void
    {
        static::created(function (Invitation $invitation): void {
            $invitation->guestGroups()->firstOrCreate(
                ['is_default' => true],
                [
                    'name' => 'General Guests',
                    'access_code' => $invitation->guest_code ?: self::generateUniqueGuestCode(),
                    'status' => 'active',
                ],
            );
        });
    }

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'slug',
        'guest_code',
        'guest_limit',
        'custom_domain',
        'custom_domain_status',
        'custom_domain_verified_at',
        'status',
        'partner1_name',
        'partner2_name',
        'wedding_date',
        'wedding_time',
        'venue_name',
        'venue_address',
        'dress_code',
        'dress_code_colors',
        'template_id',
        'color_palette',
        'music_url',
        'prenup_video_url',
        'gift_methods',
        'schedule',
        'published_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'wedding_date' => 'date',
            'guest_limit' => 'integer',
            'custom_domain_verified_at' => 'datetime',
            'dress_code_colors' => 'array',
            'color_palette' => 'array',
            'gift_methods' => 'array',
            'schedule' => 'array',
            'published_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(InvitationTemplate::class, 'template_id');
    }

    public function mediaFiles(): HasMany
    {
        return $this->hasMany(MediaFile::class);
    }

    public function loveStoryChapters(): HasMany
    {
        return $this->hasMany(LoveStoryChapter::class);
    }

    public function entourageMembers(): HasMany
    {
        return $this->hasMany(EntourageMember::class);
    }

    public function rsvps(): HasMany
    {
        return $this->hasMany(Rsvp::class);
    }

    public function guestGroups(): HasMany
    {
        return $this->hasMany(GuestGroup::class);
    }

    public function wishes(): HasMany
    {
        return $this->hasMany(Wish::class);
    }

    public function defaultGuestGroup(): HasOne
    {
        return $this->hasOne(GuestGroup::class)->where('is_default', true);
    }

    public static function generateUniqueGuestCode(): string
    {
        $characters = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

        do {
            $code = '';
            for ($index = 0; $index < 6; $index++) {
                $code .= $characters[random_int(0, strlen($characters) - 1)];
            }
        } while (
            self::query()->where('guest_code', $code)->exists()
            || GuestGroup::query()->where('access_code', $code)->exists()
        );

        return Str::upper($code);
    }
}

