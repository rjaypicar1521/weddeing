<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EntourageMember extends Model
{
    use HasFactory;

    /**
     * @var array<int, string>
     */
    public const ROLES = [
        'ninong',
        'ninang',
        'bridesmaid',
        'groomsman',
        'flower_girl',
        'ring_bearer',
    ];

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'invitation_id',
        'name',
        'role',
        'photo_path',
        'sort_order',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }

    public function invitation(): BelongsTo
    {
        return $this->belongsTo(Invitation::class);
    }
}
