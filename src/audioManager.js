(function(global) {
    'use strict';

    var emptyFn = function(){},
        support;

    support = !!(
        navigator.getUserMedia =
        navigator.getUserMedia       ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia    ||
        navigator.msGetUserMedia
    );

    // {{{ classes

    /**
     *
     * @class utils
     */
    function Utils() {}
    /**
     * //www.html5rocks.com/ja/tutorials/webaudio/intro/js/buffer-loader.js
     * @class BufferLoader
     * @param context
     * @param urlList
     * @param callback
     */
    function BufferLoader(context, urlList, callback) {
        this.context = context;
        this.urlList = urlList;
        this.onload = callback;
        this.bufferList = [];
        this.loadCount = 0;
    }
    /**
     *
     * @class AudioManager
     * @param c
     */
    function AudioManager(c) {

        c = c || {};

        if (!support) {
            console.warn('not support user media');
        }
        if (c.autoLoop === undefined) {
            c.autoLoop = true;
        }

        this.context            = null;
        this.sources            = {};
        this.analyser           = {};
        this.state              = {};
        this.fps                = c.fps || 24;
        this.autoLooop          = !!c.autoLoop;
        this.ffSize             = c.ffSize || 2048;
        this.onEnterFrame       = c.onEnterFrame     || emptyFn;
        this.onInit             = c.onInit           || emptyFn;
        this.onMicInitSuccess   = c.onMicInitSuccess || emptyFn;
        this.onMicInitFaild     = c.onMicInitFaild   || emptyFn;
        this.onLoaded           = c.onLoaded         || emptyFn;
        this.useMicrophone      = !!c.useMicrophone;
        this.isLoop             = false;
        this.isReady            = false;
        this.buffers            = null;
    }

    // }}}
    // {{{ headers

    /**
     * 溜め込んでいるバッファを順次読み込み
     * @param {string}
     * @param {int}
     */
    BufferLoader.prototype.loadBuffer = BufferLoader_loadBuffer;
    /**
     * バッファの読み込み開始
     */
    BufferLoader.prototype.load = BufferLoader_load;
    /**
     * 
     */
    AudioManager.prototype.init = AudioManager_init;
    /**
     * マイク入力許可時処理
     * @param {stream}
     */
    AudioManager.prototype.micInitSuccess = AudioManager_micInitSuccess;
    /**
     * マイク入力拒否時処理
     * @param {event}
     */
    AudioManager.prototype.micInitFaild = AudioManager_micInitFaild;
    /**
     * リソースの読み込み処理
     * @param {string[]}
     */
    AudioManager.prototype.load = AudioManager_load;
    /**
     * リソース読み込み完了時コールバック処理
     */
    AudioManager.prototype.loaded = AudioManager_loaded;
    /**
     * ループ開始処理
     */
    AudioManager.prototype.startLoop = AudioManager_startLoop;
    /**
     * ループ停止処理
     */
    AudioManager.prototype.stopLoop = AudioManager_stopLoop;
    /**
     * ループ処理本体
     */
    AudioManager.prototype.enterFrame = AudioManager_enterFrame;
    /**
     * 再生開始処理
     * @param {string} key
     */
    AudioManager.prototype.play = AudioManager_play;
    /**
     * 再生停止処理
     * @param {string} key
     */
    AudioManager.prototype.stop = AudioManager_stop;
    /**
     * 再生状態取得処理
     * @param {string} key
     * @return {boolean}
     */
    AudioManager.prototype.isPlaying = AudioManager_isPlaying;
    /**
     * 配列SUM処理
     * @param {number[]}
     */
    Utils.prototype.sum = Utils_sum;
    /**
     * 指定したオブジェクトの値をすべて取得
     * @param {object}
     * @return {string[]}
     */
    Utils.prototype.values = Utils_values;

    // }}}
    // {{{ implementations

    /**
     *
     * @param url
     * @param index
     */
    function BufferLoader_loadBuffer(url, index) {
        var me      = this,
            request = new XMLHttpRequest();

        request.open('GET', url, true);
        request.responseType = 'arraybuffer';

        request.onload = function() {
            me.context.decodeAudioData(
                request.response,
                function success(buffer) {
                    if (!buffer) {
                        global.alert('error decoding file data: ' + url);
                        return;
                    }
                    me.bufferList[index] = buffer;
                    if (++me.loadCount === me.urlList.length) {
                        me.onload(me.bufferList);
                    }
                },
                function error(error) {
                    console.error('decodeAudioData error', error);
                }
            );
        };
        request.onerror = function() {
            global.alert('BufferLoader: XHR error');
        };
        request.send();
    }
    /**
     *
     */
    function BufferLoader_load() {
        for (var i = 0; i < this.urlList.length; ++i) {
            this.loadBuffer(this.urlList[i], i);
        }
    }
    /**
     *
     */
    function AudioManager_init() {
        var me = this;

        me.context     = new global.AudioContext();

        if (me.useMicrophone) {
            navigator.getUserMedia(
                {
                    audio: true
                },
                function success(s) {
                    me.micInitSuccess(s);
                },
                function error(e) {
                    me.micInitFaild(e);
                }
            );
        } else {
            if (typeof me.onInit === 'function') {
                me.onInit();
            }
        }

        return me;
    }
    /**
     *
     */
    function AudioManager_micInitSuccess(s) {
        var me = this,
            an = me.context.createAnalyser();

        an.ffSize = me.ffSize;

        me.sources.mic = me.context.createMediaStreamSource(s);
        me.analyser.mic= {
            a: an,
            d: new Uint8Array(me.ffSize/2),
            getByteFrequencyData: function() {
                this.a.getByteFrequencyData(this.d);
                return this.d;
            }
        };
        me.sources.mic.connect(an);

        if (typeof me.onMicInitSuccess === 'function') {
            me.onMicInitSuccess();
        }

        me.isReady = true;

        if (me.autoLooop) {
            me.isLoop = true;
            me.enterFrame();
        }
    }
    /**
     *
     */
    function AudioManager_micInitFaild(e) {
        var me = this;

        console.log('reject', e);

        if (typeof me.onMicInitFaild === 'function') {
            me.onMicInitFaild();
        }
    }
    /**
     *
     * @param {string[]|object}
     */
    function AudioManager_load(sources) {
        var me = this,
            ls = null,
            ut = global.Utils,
            ks;

        if (!(sources instanceof Array)) {
            me.sources  = {};
            me.analyser = {};
            ls = ut.values(sources);
            ks = Object.keys(sources);
            for (var i = 0; i < ks.length; i++) {
                if (typeof ls[i] === 'object') {
                    me.sources[i] = {
                        name    : ks[i],
                        loop    : ls[i].loop === undefined ? true : ls[i].loop,
                        sound   : ls[i].sound === undefined ? true : ls[i].loop,
                        ffSize  : ls[i].ffSize
                    };
                    ls[i] = ls[i].path;
                } else {
                    me.sources[i] = ks[i];
                }
            }
        } else {
            ls = sources;
            me.sources  = [];
            me.analyser = [];
        }

        me.buffers = new BufferLoader(
            me.context,
            ls,
            function success() {
                me.loaded.apply(me, arguments);
            }
        );
        me.buffers.load();
    }
    /**
     *
     */
    function AudioManager_loaded() {
        var me  = this,
            len = me.buffers.bufferList.length;

        for (var i = 0; i < len; i++) {
            var n = me.sources[i] || i,
                a = me.context.createAnalyser(),
                s = true,
                l = true,
                f = null;

            if (typeof n === 'object') {
                l = n.loop;
                s = n.sound;
                f = n.ffSize;
                n = n.name;
            }

            a.ffSize = f || me.ffSize;

            me.sources[n]  = AudioManager_createSource.apply(me,[n,i,l,s]);
            me.analyser[n] = {
                a: a,
                d: new Uint8Array((f || me.ffSize) / 2),
                getByteFrequencyData: function() {
                    this.a.getByteFrequencyData(this.d);
                    return this.d;
                }
            };
            me.sources[n].connect(a);
            if (s) {
                me.sources[n].connect(me.context.destination);
            }
            if (!(me.sources instanceof Array)) {
                delete me.sources[i];
            }
        }

        me.isReady = true;

        if (typeof me.onLoaded === 'function') {
            me.onLoaded();
        }
    }
    /**
     *
     * @param {string} name
     * @param {number} idx
     * @param {boolean} loop
     * @param {boolean} sound
     */
    function AudioManager_createSource(name, idx, loop, sound) {
        var me  = this,
            src = me.context.createBufferSource();
        src.buffer = me.buffers.bufferList[idx];
        src.loop = loop;
        // 状態管理
        me.state[name] = {
            index   : idx,
            sound   : sound,
            playing : false
        };
        return src;
    }
    /**
     *
     */
    function AudioManager_startLoop() {
        var me = this;

        if (!me.isLoop) {
            me.isLoop = true;
            me.enterFrame();
        }
    }
    /**
     *
     */
    function AudioManager_stopLoop() {
        this.isLoop = false;
    }
    /**
     *
     */
    function AudioManager_enterFrame() {
        var me = this;

        if (me.isLoop && me.isReady) {
            if (typeof me.onEnterFrame === 'function') {
                me.onEnterFrame();
            }
            setTimeout(function() {
                me.enterFrame();
            }, 1000 / me.fps);
        }
    }
    /**
     * 再生開始処理
     * @param {string} key
     */
    function AudioManager_play(key) {
        var me = this,
            i, l, s;

        if (me.sources[key]) {
            i = me.state[key].index;
            l = me.sources[key].loop;
            s = me.state[key].sound;
            me.sources[key] = AudioManager_createSource.apply(me,[key,i,l,s]);
            me.sources[key].connect(me.analyser[key].a);
            if (s) {
                me.sources[key].connect(me.context.destination);
            }
            me.sources[key].start(0);
            me.state[key].playing = true;
        } else {
            console.warn('指定したKEYの音源は存在しません');
        }
    }
    /**
     * 再生停止処理
     * @param {string} key
     */
    function AudioManager_stop(key) {
        var me = this;

        if (me.sources[key]) {
            me.sources[key].stop(0);
            me.state[key].playing = false;
        } else {
            console.warn('指定したKEYの音源は存在しません');
        }
    }
    /**
     * 再生状態取得処理
     * @param {string} key
     * @return {boolean}
     */
    function AudioManager_isPlaying(key) {
        var me = this;

        if (me.state[key]) {
            return me.state[key].playing;
        } else {
            console.warn('指定したKEYの音源は存在しません');
            return false;
        }
    }
    /**
     *
     * @param {number[]}
     */
    function Utils_sum(arr) {
        var len = arr.length,
            cnt = 0;
        for (var i = 0; i < len; i++) {
            cnt += arr[i];
        }
        return cnt;
    }
    /**
     *
     * @param {object}
     */
    function Utils_values(o) {
        var keys = Object.keys(o),
            len  = keys.length,
            vals = [];
        for (var i = 0; i < len; i++) {
            vals[i] = o[keys[i]];
        }
        return vals;
    }

    // }}}
    // {{{ exports

    global.BufferLoader = BufferLoader;
    global.AudioManager = AudioManager;
    global.Utils        = new Utils();

    // }}}

})((this || 0).self || global);
