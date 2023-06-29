using Emgu.CV;
using Emgu.CV.CvEnum;
using Emgu.CV.Structure;
using Emgu.CV.Util;
using System.Drawing;

namespace TestServer.Core
{
    /* 该类型实现对试验过程中的火焰属性进行分析 */
    public class FlameAnalyzer
    {
        //分析器ID(同试验控制器ID)
        public int AnalyzerId { get; set; }
        //视频流操作对象
        private readonly VideoCapture _videoCapture;
        //视频操作锁定对象
        private readonly object lockObj;
        // 设定长度 这里 width 240 , high 160 可根据需要去设定
        private System.Drawing.Size _newSize;
        //定义火焰事件的委托
        public event EventHandler<FlameEventArgs> FlameDetected;
        // 火焰视频输出的文件名
        private string _fileName;
        // ROI区域边界坐标数组
        private List<Point> _roiPts;
        // 背景移除对象
        BackgroundSubtractorMOG2 _substractor;

        /* 火焰分析函数使用的全局变量 */
        private bool _bFirstFlame;          // 是否是当前试验过程中发生的第一帧火焰
        private bool _detected;             // 指示当前帧是否检测出火焰
        private DateTime _dtFirstFlameTime; // 当前试验过程的第一火焰帧发生时间
        private DateTime _dtPreFlameTime;   // 火焰检测过程中前一火焰帧的发生时间
        private DateTime _dtCurFlameTime;   // 火焰检测过程中当前火焰帧的发生时间        
        private Mat _mask;                  // ROI区域掩膜
        private Mat _frame;                 // 当前帧原始图
        private Mat _maskFrame;             // 当前帧Mask图                                   
        private Mat _sizedFrame;            // 改变后的图片
        private List<Mat> _flameFrames;     // 用于输出视频文件的火焰帧缓存
        VectorOfVectorOfPoint _contForColor;
        VectorOfVectorOfPoint _contForMotion;
        /*
         * 功能: 构造函数
         * 参数:
         *       url - 视频地址
         */
        public FlameAnalyzer(int id,string url,string filename)
        {
            AnalyzerId = id;
            lockObj = new object();
            _newSize = new System.Drawing.Size(240, 160);
            _fileName = filename;
            _flameFrames = new List<Mat>();
            _roiPts = new List<Point>();
            _substractor = new BackgroundSubtractorMOG2(shadowDetection:false);
            //初始化当前帧Mask
            _mask = Mat.Zeros(_newSize.Height, _newSize.Width,DepthType.Cv8U,1);
            //初始化火焰分析相关变量
            _bFirstFlame = true;
            _detected = false;
            _dtFirstFlameTime = DateTime.Now;
            _dtPreFlameTime = DateTime.Now;
            _dtCurFlameTime = DateTime.Now;
            _contForColor = new VectorOfVectorOfPoint();
            _contForMotion = new VectorOfVectorOfPoint();
            //初始化视频控制对象
            _videoCapture = new VideoCapture(url);
            _videoCapture.ImageGrabbed += Capture_ImageGrabbed;
        }

        /*
         * 功能: 加载ROI边界坐标
         * 参数:
         *       filepath - 包含分析区域ROI边界坐标的csv文件
         */
        public void LoadROI(string filepath)
        {
            // 从ROI区域文件读取坐标集合
            using (var reader = new StreamReader(filepath))
            {
                while (!reader.EndOfStream)
                {
                    var line = reader.ReadLine();
                    var values = line.Split(',');

                    _roiPts.Add(new Point(Convert.ToUInt16(values[0]),Convert.ToUInt16(values[1])));
                }
            }
        }

        /*
         * 功能: 制作ROI区域Mask
         */
        public void SetMask()
        {
            // 将System.Drawing.Point[]转换为CV.IInputArray类型
            VectorOfPoint vp = new VectorOfPoint(_roiPts.ToArray());
            // 制作ROI区域Mask
            CvInvoke.FillConvexPoly(_mask, vp, new MCvScalar(255));
        }

        /* 定义接口函数 */
        //开始执行火焰检测程序
        public void StartAnalyzing()
        {
            _videoCapture.Start();
        }
        //停止执行火焰检测程序
        public void StopAnalyzing()
        {
            _videoCapture.Stop();
        }

        protected virtual void FireFlameDetected(FlameEventArgs e)
        {
            EventHandler<FlameEventArgs> handler = FlameDetected;
            handler?.Invoke(this, e);
            //if (handler != null) {
            //    handler(this, e);
            //}
        }

        private void Capture_ImageGrabbed(object sender, EventArgs e)
        {
            try
            {  
                lock (lockObj)
                {
                    if (_videoCapture != null)
                    {
                        if (!_videoCapture.Retrieve(_frame))
                        {
                            _frame.Dispose();
                            return;
                        }
                        if (_frame.IsEmpty)
                            return;

                        // 记录当前帧的获取时间
                        _dtCurFlameTime = DateTime.Now;
                        // 提取炉芯ROI区域
                        _frame.CopyTo(_maskFrame,_mask);
                        //调整帧大小以提高分析效率
                        CvInvoke.Resize(_maskFrame, _sizedFrame, _newSize, 0, 0);
                        //执行火焰检测(基于_sizedFrame)
                        DoFlameAnalyze();
                    }
                }
            }
            catch (Exception)
            {

            }
        }

        /*
         * 功能: 火焰分析函数(基于_sizedFrame)
         * 参数:
         *       _frame - 全局变量,对其进行火焰分析的视频帧
         */
        private void DoFlameAnalyze()
        {            
            Mat _gray = new Mat();  // 灰度帧
            Mat _temp1 = new Mat(); // 用于颜色判定的临时帧
            Mat _temp2 = new Mat(); // 用于动作判定的临时帧
            _contForColor.Clear();
            _contForMotion.Clear();
            // 执行持续5秒以上火焰的分析逻辑
            CvInvoke.CvtColor(_sizedFrame, _gray,ColorConversion.Bgr2Gray);
            // 基于颜色的判定
            CvInvoke.GaussianBlur(_gray,_temp1,new Size(9,9),0);
            CvInvoke.Threshold(_temp1, _temp1,160,255,ThresholdType.Binary);
            CvInvoke.FindContours(_temp1, _contForColor,null, RetrType.External, ChainApproxMethod.ChainApproxNone);
            // 基于动作追踪的判定
            _substractor.Apply(_temp2, _temp2, 0.4);
            CvInvoke.FindContours(_temp2, _contForMotion, null, RetrType.External, ChainApproxMethod.ChainApproxNone);
            // 对Contour进行排序,取面积最大的作为判定依据
            List<VectorOfPoint> _lstConts = new List<VectorOfPoint>();
            for(var i = 0;i < _contForMotion.Length;i++)
            {
                _lstConts.Add(_contForMotion[i]);
            }
            _lstConts.Sort((cnt1, cnt2) =>
            {
                return CvInvoke.ContourArea(cnt2).CompareTo(CvInvoke.ContourArea(cnt1));
            });
            // 判定当前帧是否有火焰
            if (_contForColor.Length > 0 && _contForMotion.Length > 0 && (int)CvInvoke.ContourArea(_lstConts[0]) > 0) {
                if(!_detected) {
                    // 记录第一帧火焰产生的时间戳
                    _dtFirstFlameTime = _dtCurFlameTime;
                    // 设置火焰检测标志
                    _detected = true;
                }
                // 更新前一火焰帧的时间戳
                _dtPreFlameTime = _dtCurFlameTime;
                // 记录当前帧画面
                _flameFrames.Add(_frame);
            } else if(_detected) {  // 当前帧无火焰,但是尚处于连续火焰过程中的情况
                // 时间间隔小于1秒的情况,认为时连续火焰帧
                if ((_dtCurFlameTime - _dtPreFlameTime).TotalMilliseconds < 1000) {
                    // 记录当前帧画面
                    _flameFrames.Add(_frame);
                } else {
                    // 设置火焰检测标志
                    _detected = false;
                    // 判断本次连续火焰持续时间是否超过5秒,若超过则记录视频文件并停止后续检测
                    int flameDuration = (int)(_dtPreFlameTime - _dtFirstFlameTime).TotalSeconds;
                    if (flameDuration >= 5)
                    {
                        // 停止后续检测
                        _videoCapture.Stop();                        
                        // 发送事件消息                        
                        FlameEventArgs flameEvt = new()
                        {
                            Time = _dtFirstFlameTime,
                            Duration = flameDuration
                        };
                        //调用事件委托
                        FireFlameDetected(flameEvt);
                        // 输出持续火焰视频文件
                        OutputFlameFrames();
                    }
                    // 清空火焰帧缓存
                    _flameFrames.Clear();
                }                
            } else { // 当前帧无火焰,且不处于连续火焰过程中的情况

            }
        }

        /*
         * 功能: 保存火焰帧至视频文件
         */
        private void OutputFlameFrames()
        {
            if(_flameFrames.Count > 0)
            {
                // 初始化视频输出对象
                VideoWriter writer = new VideoWriter(_fileName, VideoWriter.Fourcc('X', 'V', 'I', 'D'),
                   new Size(640, 480), true);
                // 逐帧输出视频文件
                _flameFrames.ForEach(frame => {
                    writer.Write(frame);
                });
                // 清空火焰帧缓存
                _flameFrames.Clear();
            }            
        }
    }
    /* 定义火焰事件的参数 */
    public class FlameEventArgs : EventArgs
    {
        //起火时间
        public DateTime Time { get; set; }
        //持续燃烧时间
        public int Duration { get; set; }
    }
}