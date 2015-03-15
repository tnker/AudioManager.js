(function(global) {
    'use strict';

    // {{{ initialize variables

    var emptyFn = function(){},
        support;

    support = !!(
        navigator.getUserMedia =
        navigator.getUserMedia       ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia    ||
        navigator.msGetUserMedia
    );

    // }}}
    // {{{ const variables

    var MAX_VOLUME = 1,
        MIN_VOLUME = 0;

    // }}}
    // {{{ audio api fallback

    global.AudioContext = (
        global.AudioContext ||
        global.webkitAudioContext
    );

    global.requestAnimationFrame = (
        global.requestAnimationFrame        ||
        global.mozRequestAnimationFrame     ||
        global.webkitRequestAnimationFrame  ||
        global.msRequestAnimationFrame
    );

    // }}}
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
        this.analysers          = {};
        this.gains              = {};
        this.state              = {};
        this.fps                = c.fps     || 60;
        this.ffSize             = c.ffSize  || 2048;
        this.onEnterFrame       = c.onEnterFrame     || emptyFn;
        this.onInit             = c.onInit           || emptyFn;
        this.onMicInitSuccess   = c.onMicInitSuccess || emptyFn;
        this.onMicInitFaild     = c.onMicInitFaild   || emptyFn;
        this.onLoaded           = c.onLoaded         || emptyFn;
        this.autoLooop          = !!c.autoLoop;
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
     * 再生一時停止処理
     * @param {string} key
     */
    AudioManager.prototype.pause = AudioManager_pause;
    /**
     * 再生状態取得処理
     * @param {string} key
     * @return {boolean}
     */
    AudioManager.prototype.isPlaying = AudioManager_isPlaying;
    /**
     * 再生ピッチ設定用処理
     * @param {string} key
     * @param {number} val
     */
    AudioManager.prototype.setPitch = AudioManager_setPitch;
    /**
     * 音量変更処理
     * @param {string} key
     * @param {number} val
     */
    AudioManager.prototype.setVolume = AudioManager_setVolume;
    /**
     * Audio Element バインド
     * @param {string} key
     * @param {string} sel
     */
    AudioManager.prototype.bindEl = AudioManager_bindEl;
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
    function BufferLoader_loadBuffer(url, index) {//{{{
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
    }//}}}
    /**
     *
     */
    function BufferLoader_load() {//{{{
        for (var i = 0; i < this.urlList.length; ++i) {
            this.loadBuffer(this.urlList[i], i);
        }
    }//}}}
    /**
     *
     */
    function AudioManager_init() {//{{{
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
            if (me.autoLooop) {
                me.isReady = true;
                me.startLoop();
            }
        }

        return me;
    }//}}}
    /**
     * マイク入力許可後初期化処理
     * @param s
     */
    function AudioManager_micInitSuccess(s) {//{{{
        var me = this,
            an = me.context.createAnalyser();

        an.ffSize = me.ffSize;

        me.sources.mic = me.context.createMediaStreamSource(s);
        me.analysers.mic= {
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
    }//}}}
    /**
     * マイク入力拒否後初期化処理
     * @param e
     */
    function AudioManager_micInitFaild(e) {//{{{
        var me = this;

        console.log('reject', e);

        if (typeof me.onMicInitFaild === 'function') {
            me.onMicInitFaild();
        }
    }//}}}
    /**
     *
     * @param {string[]|object}
     */
    function AudioManager_load(sources) {//{{{
        var me = this,
            ls = null,
            ut = global.Utils,
            ks;

        if (!(sources instanceof Array)) {
            me.sources  = {};
            me.analysers= {};
            ls = ut.values(sources);
            ks = Object.keys(sources);
            for (var i = 0; i < ks.length; i++) {
                if (typeof ls[i] === 'object') {
                    me.sources[i] = {
                        name    : ks[i],
                        loop    : ls[i].loop === undefined ? true : ls[i].loop,
                        sound   : ls[i].sound === undefined ? true : ls[i].loop,
                        ffSize  : ls[i].ffSize,
                        gain    : ls[i].gain
                    };
                    ls[i] = ls[i].path;
                } else {
                    me.sources[i] = ks[i];
                }
            }
        } else {
            ls = sources;
            me.sources  = [];
            me.analysers= [];
        }

        me.buffers = new BufferLoader(
            me.context,
            ls,
            function success() {
                AudioManager__loaded.apply(me, arguments);
            }
        );
        me.buffers.load();
    }//}}}
    /**
     * リソース読み込み完了時コールバック処理
     * @private
     */
    function AudioManager__loaded() {//{{{
        var me  = this,
            len = me.buffers.bufferList.length;

        for (var i = 0; i < len; i++) {
            var o = me.sources[i] || i,
                s = true,
                n = '';

            if (typeof o === 'object') {
                s = o.sound;
                n = o.name;
            } else {
                n = o;
                o = {
                    name    : n,
                    loop    : true,
                    sound   : s,
                    gain    : null
                };
            }

            me.sources[n]   = AudioManager__createSource.apply(me,[o, i]);
            me.analysers[n] = AudioManager__createAnalyser.apply(me, [o]);

            if (o.gain) {
                me.gains[n] = AudioManager__createGain.apply(me, [o]);
            }

            if (!(me.sources instanceof Array)) {
                delete me.sources[i];
            }
        }

        me.isReady = true;

        if (typeof me.onLoaded === 'function') {
            me.onLoaded();
        }
    }//}}}
    /**
     *
     * @private
     * @param {object} info
     * @param {number} index
     */
    function AudioManager__createSource(info, index) {//{{{
        var me  = this,
            src = me.context.createBufferSource();

        src.buffer = me.buffers.bufferList[index];
        src.loop = info.loop;
        // fallback
        if (!!info.gain) {
            src.start = src.start || src.noteGainOn;
            src.stop  = src.stop  || src.noteGainOff;
        } else {
            src.start = src.start || src.noteOn;
            src.stop  = src.stop  || src.noteOff;
        }
        // 状態管理
        if (me.state[info.name] === undefined) {
            me.state[info.name] = {
                index       : index,
                isReset     : true,
                sound       : info.sound,
                playing     : false,
                startTime   : 0,
                pauseTime   : 0,
                retryTime   : 0,
                offsetTime  : 0,
                pitch       : 1,
                gain        : info.gain,
                volume      : info.volume
            };
        }
        // 再生ピッチ設定
        src.playbackRate.value = me.state[info.name].pitch;
        return src;
    }//}}}
    /**
     *
     * @private
     * @param {object} info
     */
    function AudioManager__createAnalyser(info) {//{{{
        var me = this,
            analyser;
        if (me.analysers[info.name] === undefined) {
            analyser         = me.context.createAnalyser();
            analyser.ffSize  = info.ffSize || me.ffSize;
            return {
                a: analyser,
                d: new Uint8Array((info.ffSize || me.ffSize) / 2),
                getByteFrequencyData: function() {
                    this.a.getByteFrequencyData(this.d);
                    return this.d;
                }
            };
        } else {
            return me.analysers[info.name];
        }
    }//}}}
    /**
     *
     * @private
     * @param {object} info
     */
    function AudioManager__createGain(info) {//{{{
        var me = this,
            gain;
        if (me.gains[info.gain] === undefined) {
            gain = me.context.createGain();
            return gain;
        } else {
            return me.gains[info.gain];
        }
    }//}}}
    /**
     * 毎フレーム処理開始処理
     */
    function AudioManager_startLoop() {//{{{
        var me = this;

        if (!me.isLoop) {
            me.isLoop = true;
            me.enterFrame();
        }
    }//}}}
    /**
     * 毎フレーム処理停止処理
     */
    function AudioManager_stopLoop() {//{{{
        this.isLoop = false;
    }//}}}
    /**
     * 毎フレーム処理
     */
    function AudioManager_enterFrame() {//{{{
        var me = this;

        if (me.isLoop && me.isReady) {
            if (typeof me.onEnterFrame === 'function') {
                me.onEnterFrame();
            }
            if (me.fps === 60) {
                requestAnimationFrame(function() {
                    me.enterFrame();
                });
            } else {
                setTimeout(function() {
                    me.enterFrame();
                }, 1000 / me.fps);
            }
        }
    }//}}}
    /**
     * 各ノードの接続処理
     * @private
     * @param {string} key
     */
    function AudioManager__connectNode(key) {//{{{
        var me      = this,
            state   = me.state[key] || {},
            source  = me.sources[key],
            analyser= me.analysers[key],
            gain    = me.gains[state.gain],
            target;
        // GainNodeが存在する場合はSourceと
        // GainNodeを接続する
        if (gain) {
            source.connect(analyser.a);
            source.connect(gain);
            target = gain;
        } else {
            source.connect(analyser.a);
            target = source;
        }
        // サウンドの設定が有効担っている場合は
        // 対象ノードとスピーカーを接続する
        if (state.sound) {
            target.connect(me.context.destination);
        }
    }//}}}
    /**
     * 再生開始処理
     * @param {string} key
     */
    function AudioManager_play(key) {//{{{
        var me          = this,
            startTime   = 0,
            pauseTime   = 0,
            retryTime   = 0,
            playTime    = 0,
            offsetTime  = 0,
            i, l, s;

        if (me.sources[key]) {
            // SourceNodeを再度インスタンスの生成を行う
            i = me.state[key].index;
            l = me.sources[key].loop;
            s = me.state[key].sound;
            me.sources[key] = AudioManager__createSource.apply(me,[key,i,l,s]);
            // 生成済みの各ノード接続処理
            AudioManager__connectNode.apply(me, [key]);

            if (me.state[key].isReset) {
                startTime = me.context.currentTime;
                retryTime = startTime;
                pauseTime = 0;
                offsetTime= 0;
                me.state[key].startTime = startTime;
                me.state[key].retryTime = retryTime;
                me.state[key].pauseTime = pauseTime;
                me.state[key].offsetTime= offsetTime;
                me.state[key].isReset = false;
            } else {
                startTime  = me.state[key].startTime;
                retryTime  = me.context.currentTime;
                pauseTime  = me.state[key].pauseTime;
                offsetTime = me.state[key].offsetTime;
                offsetTime += retryTime - pauseTime;
                me.state[key].retryTime = retryTime;
                me.state[key].pauseTime = pauseTime;
                me.state[key].offsetTime= offsetTime;
            }
            playTime = retryTime - startTime - offsetTime;
            me.sources[key].start(0, playTime);
            me.state[key].playing = true;
        } else {
            console.warn('指定したKEYの音源は存在しません');
        }
    }//}}}
    /**
     * 再生停止処理
     * @param {string} key
     */
    function AudioManager_stop(key) {//{{{
        var me = this;

        if (me.sources[key]) {
            me.sources[key].stop(0);
            me.state[key].playing = false;
            me.state[key].isReset = true;
        } else {
            console.warn('指定したKEYの音源は存在しません');
        }
    }//}}}
    /**
     * 再生一時停止処理
     * @param {string} key
     */
    function AudioManager_pause(key) {//{{{
        var me = this;

        if (me.sources[key]) {
            me.sources[key].stop(0);
            me.state[key].pauseTime = me.context.currentTime;
            me.state[key].playing = false;
        } else {
            console.warn('指定したKEYの音源は存在しません');
        }
    }//}}}
    /**
     * 再生状態取得処理
     * @param {string} key
     * @return {boolean}
     */
    function AudioManager_isPlaying(key) {//{{{
        var me = this;

        if (me.state[key]) {
            return me.state[key].playing;
        } else {
            console.warn('指定したKEYの音源は存在しません');
            return false;
        }
    }//}}}
    /**
     * 再生ピッチ設定用処理
     * @param {string} key
     * @param {number} val
     */
    function AudioManager_setPitch(key, val) {//{{{
        var me = this;

        if (me.sources[key]) {
            me.sources[key].playbackRate.value = val;
            me.state[key].pitch = val;
        } else {
            console.warn('指定したKEYの音源は存在しません');
        }
    }//}}}
    /**
     * 音量変更処理
     * @param {string} key
     * @param {number} val
     */
    function AudioManager_setVolume(key, val) {//{{{
        var me = this;

        if (me.gains[key]) {
            // 閾値チェック
            if (MAX_VOLUME < val) {
                val = MAX_VOLUME;
            }
            if (MIN_VOLUME > val) {
                val = MIN_VOLUME;
            }
            me.gains[key].gain.value = val;
        } else {
            console.warn('音源の音量を変更する場合はGainが必要です');
        }
    }//}}}
    /**
     * Audio Element バインド
     * @param {string} key
     * @param {string} sel
     */
    function AudioManager_bindEl(key, sel) {//{{{
        var me  = this,
            el  = document.querySelector(sel),
            src = null;

        // TODO
        if (sel) {
            src = me.context.createMediaElementSource(el);
        }
    }//}}}
    /**
     *
     * @param {number[]}
     */
    function Utils_sum(arr) {//{{{
        var len = arr.length,
            cnt = 0;
        for (var i = 0; i < len; i++) {
            cnt += arr[i];
        }
        return cnt;
    }//}}}
    /**
     *
     * @param {object}
     */
    function Utils_values(o) {//{{{
        var keys = Object.keys(o),
            len  = keys.length,
            vals = [];
        for (var i = 0; i < len; i++) {
            vals[i] = o[keys[i]];
        }
        return vals;
    }//}}}

    // }}}
    // {{{ exports

    global.BufferLoader = BufferLoader;
    global.AudioManager = AudioManager;
    global.Utils        = new Utils();

    // }}}

})((this || 0).self || global);
