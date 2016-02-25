<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App;

class SocketIOServiceProvider extends ServiceProvider
{
    /**
     * Indicates if loading of the provider is deferred.
     *
     * @var bool
     */
    protected $defer = true;
    /**
     * Register the service provider.
     *
     * @return void
     */
    public function register()
    {
        $this->app->bind('socketio', function()
        {
            return new App\Library\SocketIO();
        });

        $this->app->alias('SocketIO', 'App\SocketIO');
    }

    public function provides()
    {
        return array('SocketIO');
    }
}
