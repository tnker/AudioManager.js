# AudioManager.js

Web Audio APIでとりあえず遊んでみたい人たち向け簡易ライブラリ

## 使い方

    window.onload = function() {
        var manager = new AudioManager({
            // 設定オプション...
        });
        manager.init();
    };

もしくは

    window.onload = function() {
        var manager = (new AudioManager({
            // 設定オプション...
        })).init();
    };

## 設定オプション

- fps
    - onEnterFrame（後記）に設定した関数を毎秒実行する間隔
        - type: int
        - default: 24
- autoLoop
    - onEnterFrame（後記）を自動的に開始するかどうか
        - type: boolean
        - default: true
- fftSize
    - 入力音声から波形データを取得する際のレンジ
    - 基本的には [32, 64, 128, 256, 512, 1024, 2048] のいずれか
        - type: int
        - default: 2048
- useMicrophone
    - マイク入力を利用する場合は true を設定する
        - type: boolean
        - default: false
- onEnterFrame
    - 毎フレーム実行を行いたい関数を設定
        - type: function
        - default: empty function
- onMicInitSuccess
    - マイク入力が許可されAudioManager側の初期化処理完了後に実行したい関数を設定
        - type: function
        - default: empty function
- onMicInitFaild
    - マイク入力が拒否された際に実行したい関数を設定
        - type: function
        - default: empty function
- onInit 
    - AudioManagerの初期化処理完了後に実行したい関数を設定
    - useMicrophoneがtrueの場合は呼ばれません
        - type: function
        - default: empty function
- onLoaded
    - 音源データの読み込み完了後に実行したい関数を設定
        - type: function
        - default: empty function
        

## 設定オプション指定方法

AudioManagerのコンストラクタ実行時、オブジェクトリテラルで指定します。

    window.onload = function() {
        var manager = (new AudioManager({
            fps             : 60,
            useMicrophone   : true,
            onMicInitFaild  : function() {
                alert('マイク入力がリジェクトされました');
            },
            onEnterFrame    : function() {
                // なんか処理...
            }
        })).init();
    };

##音源データの読み込み方法

AudioManagerのインスタンスに対して `load` メソッドを実行します。  

    var manager = (new AudioManager({...})).init();
    manager.load({
        jaz : './jaz.mp3',
        pop : './pop.mp3'
    });

`load` メソッドの引数の指定方法にはいくつかパターンがあります。

###単純なKey/Valueでの読み込み

上記例に記載しているやり方

    manager.load({
        jaz : './jaz.mp3',
        pop : './pop.mp3'
    });

###音源ごとに設定を行いつつ読み込み

Keyに対してValueをオブジェクトリテラルで設定することで、各音源に対して少しだけ設定を行うことができます。


    manager.load({
        jaz : {
            path    : './jaz.mp3',
            loop    : false,
            sound   : true,
            fftSize     : 256
        },
        pop : {
            path    : './mp3.mp3'
        }
    });

#### 設定可能なプロパティ

- path
    - 音源ファイルのファイルパス
        - type: string
        - required
- loop
    - 音源の再生をループさせるかどうか
        - type: boolean
        - default: true
- sound
    - 再生時スピーカーから音を鳴らさない（波形データのみ欲しい場合に利用）
        - type: boolean
        - default: false
- fftSize
    - 入力音声から波形データを取得する際のレンジ
    - こちらを指定した場合はAudioManagerのコンストラクタ時に指定した値よりも優先されます
        - type: int
        - default: undefined

###ファイルパスを配列にいれて読み込む

一応読み込めるけど、`useMicrophone: true`と併用できないので非推奨です。  
もしかしたら併用できるように調整するかもしれないです。

    manager.load([
        './jaz.mp3',
        './pop.mp3'
    ]);
    
## AudioSource/AnalyserNodeについて

音源データや波形データなどの管理を行うNodeの参照方法について

基本的に音源データの読み込みもしくは、マイク入力を有効にするとAudioManagerインスタンスにぶら下がっている2つの各プロパティにそれぞれのインスタンスが生成されます。

- manager.sources
    - マイク入力もしくは読み込んだ音源のAudioSourceの参照を保持
- manager.analyser
    - me.sourcesで合わせてAnalyserNodeをラップしたオブジェクトが生成される

####manager.analyser補足

何かしらの音源データと対になるanalyserが生成された場合、共通して下記のような構成になってます。

通常analyserに紐づく、波形データを更新する場合はanalyserNodeを通して処理する必要がありますが、AnalyserNodeをラップしたオブジェクトに対して付加している `getByteFrequencyData`メソッド叩けば、更新後の波形データの配列が取得できるようになっています。

    // xxxは、実際にはsources側と対になる名称
    
    // wrap object
    manager.analyser.xxx
    // analyser node
    manager.analyser.xxx.a
    // analyser data (波形データ)
    manager.analyser.xxx.d
    // analyser data update method
    manager.analyser.xxx.getByteFrequencyData()

> ※ managerは、AudioManagerインスタンスへの参照として読み替えてください

###マイク入力の場合

`useMicrophone: true`に設定した状態で、初期化処理完了後各プロパティ配下にそれぞれ `mic` という名前でプロパティ生えます。

####AudioSource

    manager.sources.mic
    
####AnalyserNode

    manager.analyser.mic

### 音源データを読み込んだ場合

マイク入力を有効にした場合は固定で `mic` というプロパティが生成されますが、音源データを読み込んだ際に生成されるプロパティは、音源データ読み込み処理の `load` メソッドに渡した引数のオブジェクトに設定したキーになります。

####音源の読み込み処理

    manager.load({
        jaz : './jaz.mp3',
        pop : './pop.mp3'
    });

読み込み処理完了後に生成される各プロパティ

####AudioSource

    manager.sources.jaz
    manager.sources.pop
    
####AnalyserNode

    manager.analyser.jaz
    manager.analyser.pop

>※ 配列で音源データを読み込んだ場合、`sources` および `analyser` プロパティの中身が配列に変わります

### 音源データの再生／停止／再生状態取得

現在３パターンの操作のみです。  
再生位置を保持した一時停止処理なんかは後で実装します。

####音源データの再生メソッド

- manager.play('pop')
    - 引数は音源データのキーを指定
    
####音源データの停止メソッド

- manager.stop('pop')
    - 引数は音源データのキーを指定

####音源データの再生状態取得メソッド

- manager.isPlaying('pop')
    - 引数は音源データのキーを指定
    
## その他利用可能なメソッド

- manager.startLoop()
    - onEnterFrame処理を開始
- manager.stopLoop()
    - onEnterFrame処理を停止
