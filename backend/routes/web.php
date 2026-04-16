<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/i/{slug}/{path?}', function (Request $request, string $slug, ?string $path = null) {
    $frontendUrl = rtrim((string) env('FRONTEND_URL', ''), '/');
    if ($frontendUrl === '') {
        abort(404);
    }

    $target = "{$frontendUrl}/i/{$slug}";
    if ($path !== null && $path !== '') {
        $target .= '/' . ltrim($path, '/');
    }

    $query = $request->getQueryString();
    if ($query) {
        $target .= "?{$query}";
    }

    return redirect()->away($target);
})->where('path', '.*')->middleware('custom.domain.redirect');
