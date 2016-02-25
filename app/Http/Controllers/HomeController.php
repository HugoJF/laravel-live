<?php

namespace App\Http\Controllers;

use App\Http\Requests;
use Tymon\JWTAuth\Facades\JWTAuth;
use Auth;

class HomeController extends Controller
{

    public function __construct()
    {
        $this->middleware('auth');
    }

    public function index()
    {
        return view('home');
    }

    public function chat()
    {
        $user = Auth::user();


        $token = JWTAuth::fromUser($user, [
            'name' => str_replace(' ', '',$user->inGameName),
            'defaultRoom' => $user->defaultRoom
        ]);

        return view('chat')->with([
            'token' => $token
        ]);
    }
}
