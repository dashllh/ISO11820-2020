using Emgu.CV;

namespace TestServer.Core
{
    /* 该类型实现对试验过程中的火焰属性进行分析 */
    public class FlameAnalyzer
    {
        //分析器ID(同试验控制器ID)
        public int AnalyzerId { get; set; }
        //视频流操作对象
        VideoCapture _videoCapture;
        //视频操作锁定对象
        private object lockObj;
        // 设定长度 这里 width 240 , high 160 可根据需要去设定
        private System.Drawing.Size _newSize;
        //定义火焰事件的委托
        public event EventHandler<FlameEventArgs> FlameDetected;

        //测试变量
        private int iCnt;

        /* 火焰分析函数使用的全局变量 */
        private bool     _bFirstFlame;      //是否是当前试验过程中发生的第一帧火焰
        private DateTime _dtFirstFlameTime; //当前试验过程的第一火焰帧发生时间
        private DateTime _dtPreFlameTime;   //火焰检测过程中前一火焰帧的发生时间
        private DateTime _dtCurFlameTime;   //火焰检测过程中当前火焰帧的发生时间

        /*
         * 功能: 构造函数
         * 参数:
         *       url - 视频地址
         */
        public FlameAnalyzer(int id,string url)
        {
            AnalyzerId = id;
            lockObj = new object();
            _newSize = new System.Drawing.Size(240, 160);
            //初始化火焰分析相关变量
            _bFirstFlame = true;
            _dtFirstFlameTime = DateTime.Now;
            _dtPreFlameTime = DateTime.Now;
            _dtCurFlameTime = DateTime.Now;
            //初始化视频控制对象
            //_videoCapture = new VideoCapture(url);
            _videoCapture = new VideoCapture("E:\\11.mp4");
            _videoCapture.ImageGrabbed += _capture_ImageGrabbed;
        }

        /* 定义接口函数 */
        public void StartAnalyzing()
        {
            _videoCapture.Start();
        }

        public void StopAnalyzing()
        {
            _videoCapture.Stop();
        }

        protected virtual void FireFlameDetected(FlameEventArgs e)
        {
            EventHandler<FlameEventArgs> handler = FlameDetected;
            if (handler != null) {
                handler(this, e);
            }
        }

        private void _capture_ImageGrabbed(object sender, EventArgs e)
        {
            try
            {                
                Mat frame = new Mat(); // 原图                
                Mat sizedFrame = new Mat(); // 改变后的图片
                lock (lockObj)
                {
                    if (_videoCapture != null)
                    {
                        if (!_videoCapture.Retrieve(frame))
                        {
                            frame.Dispose();
                            return;
                        }
                        if (frame.IsEmpty)
                            return;

                        //调整帧大小以提高分析效率
                        CvInvoke.Resize(frame, sizedFrame, _newSize, 0, 0);
                        //执行火焰检测
                        DoFlameAnalyze(sizedFrame);
                    }
                }
            }
            catch (Exception ex)
            {

            }
        }

        /*
         * 功能: 火焰分析函数
         * 参数:
         *       frame - 对其进行火焰分析的视频帧
         */
        private void DoFlameAnalyze(Mat frame)
        {
            //执行持续5秒以上火焰的分析逻辑
            if(iCnt++ == 500) {
                //确认持续5秒以上的火焰,通知试验控制器对象并停止后续检测
                _videoCapture.Stop();
                FlameEventArgs flameEvt = new FlameEventArgs();
                flameEvt.Time = 10;
                flameEvt.Duration = 5;
                //调用事件委托
                FireFlameDetected(flameEvt);
            }
        }
    }
    /* 定义火焰事件的参数 */
    public class FlameEventArgs : EventArgs
    {
        //起火时间
        public int Time { get; set; }
        //持续燃烧时间
        public int Duration { get; set; }
    }
}
