<!DOCTYPE html>
<!--[if IE 9]>
<html class="lt-ie10" lang="en"> <![endif]-->
<html class="no-js" lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Live Chat</title>
    <link rel='shortcut icon' type='image/x-icon' href='{{ asset('/favicon.ico') }}'/>
    <link rel="stylesheet" href="{{ asset('css/normalize.css') }}">
    <link rel="stylesheet" href="{{ asset('css/foundation.min.css') }}">
    <link rel="stylesheet" href="{{ asset('css/app.min.css') }} ">
    <link href='//fonts.googleapis.com/css?family=Open+Sans:400italic,700italic,400,700' rel='stylesheet'
          type='text/css'>
    <script src="{{ asset('js/vendor/modernizr.js') }}"></script>
</head>
<body>
<div class="off-canvas-wrap full-height" data-offcanvas>
    <div class="inner-wrap full-height">
        <nav class="tab-bar">
            <section class="left-small">
                <a class="left-off-canvas-toggle menu-icon" href="#"><span></span></a>
            </section>
            <section class="middle tab-bar-section">
                <h1 class="title">{{ auth()->user()->defaultRoom }}</h1>
            </section>
            <section class="right-small hide-for-large-up">
                <a class="right-off-canvas-toggle menu-icon" href="#"><span></span></a>
            </section>
        </nav>
        <aside class="left-off-canvas-menu">
            <ul class="off-canvas-list">
                <li><a href="{{ url('/') }}" class="footer currentChannel">Home</a></li>
                <li><label>Nickname</label></li>
                <li><a href="#" class="footer" id="nickname"></a></li>
                <li><label>Current Channel</label></li>
                <li><a href="#" class="footer currentChannel">#{{ auth()->user()->defaultRoom }}</a></li>
                <li><label>Settings</label></li>
                <li><a href="#" id="enableNotifications" class="footer">Enable Desktop Notifications</a></li>
                <li><a href="#" id="toggleSounds" class="footer">Enable Message Sounds</a></li>
                <li><label>Join Rooms</label></li>
                <li><a href="#" id="csgo_room" class="footer">Counter-Strike: Global Offensive</a></li>
                <li><a href="#" id="dota2_room" class="footer">DOTA 2</a></li>
                <li><a href="#" id="hearthstone_room" class="footer">Hearthstone</a></li>
                <li><label>Powered by</label></li>
                <li><a href="http://nodejs.org/" target="_blank" class="footer">Node.js</a></li>
                <li><a href="http://expressjs.com/" target="_blank" class="footer">Express</a></li>
                <li><a href="http://socket.io/" target="_blank" class="footer">Socket.io</a></li>
                <li><a href="http://foundation.zurb.com/" target="_blank" class="footer">Foundation</a></li>
                <li><a href="http://momentjs.com" target="_blank" class="footer">Moment.js</a></li>
                <li><a href="http://eightmedia.github.io/hammer.js/" target="_blank" class="footer">Hammer</a></li>
                <li><a href="https://github.com/MatthewLavine/NodeJS-Chat" target="_blank" class="footer">GitHub</a>
                </li>
            </ul>
        </aside>
        <aside class="right-off-canvas-menu">
            <ul class="off-canvas-list" id="usersList">
                <li><label>Users</label></li>
            </ul>
        </aside>
        <section class="main-section full-height">
            <br>

            <div class="row full-height">
                <div class="large-12 columns full-height">
                    <div id="chatLog" class="chatLog">
                        <div id="history" class="history large-10 columns full-height"></div>
                        <div id="inlineUsers" class="inlineUsers history show-for-large-up large-2 columns full-height">
                            <ul class="noList" id="inlineUsersList">
                                <li><label>Online Users</label></li>
                            </ul>
                        </div>
                    </div>
                    <input autofocus autocomplete="off" type="text" class="chatBox" onKeyUp="checkInput()" id="chatBox"
                           placeholder="Type a message..." maxlength="500">
                </div>
            </div>
        </section>
        <a class="exit-off-canvas"></a>
    </div>
</div>
<script>
    var authToken = '{{ $token }}';
</script>
<script src="{{ asset('js/vendor/jquery.js') }}"></script>
<script src="{{ asset('js/foundation.min.js') }}"></script>
<script src="{{ asset('js/sha1.js') }}"></script>
<script src="{{ asset('js/hammer.min.js') }}"></script>
<script src="{{ asset('js/moment.min.js') }}"></script>
<script src="{{ asset('js/jquery.cookie.js') }}"></script>
<script src="{{ asset('js/notify.js') }}"></script>
<script src="{{ asset('js/socket.io.min.js') }}"></script>
<script src="{{ asset('js/app.js') }}"></script>
</body>
</html>
