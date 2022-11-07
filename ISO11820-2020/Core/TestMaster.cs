using Microsoft.AspNetCore.SignalR;
using System.Text.Json;
using TestServer.Global;
using TestServer.Hubs;
using TestServer.Models;
using MathNet.Numerics;
using CsvHelper;
using System.IO;
using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Internal;
//using Microsoft.Office.Interop.Excel;

namespace TestServer.Core
{
    //定义控制器任务模式枚举
    public enum MasterWorkMode
    {
        Standby = 0,     //待命模式(一般为刚登录系统时)
        Calibration,     //标定、校准模式
        SampleTest       //样品试验模式
    }

    //定义控制器状态枚举
    public enum MasterStatus
    {
        Idle = 0,       //空闲状态(一般为刚登录系统时)
        Preparing,      //试验或标定条件准备中(比如:将温度恒定在某个范围)
        Ready,          //达到进行样品试验或系统标定的条件(比如:温度已经恒定在规定范围)
        Recording,      //开启数据记录
        Complete,       //当前试验结束
        Exception       //发生异常
    }

    //定义传感器采集数据类型(对应试验中的所有需要"采集"的传感器数据)
    public class SensorDataCatch
    {
        /* 传感器数据项 */
        public int Timer { get; set; }      //试验计时器
        public double Temp1 { get; set; }   //炉内温度1 
        public double Temp2 { get; set; }   //炉内温度2
        public double TempSuf { get; set; } //表面温度
        public double TempCen { get; set; } //中心温度
    }

    //定义客户端通信(SignalR)缓存对象
    public class SignalRCatch
    {
        public int MasterId { get; set; }   //试验控制器ID
        public int MasterMode { get; set; } //控制器工作模式
        public int MasterStatus { get; set; } //控制器状态
        /* 传感器数据项 */
        public int Timer { get; set; }      //试验计时器
        public double Temp1 { get; set; }   //炉内温度1 
        public double Temp2 { get; set; }   //炉内温度2
        public double TempSuf { get; set; } //表面温度
        public double TempCen { get; set; } //中心温度
        /* 计算数据项 */
        public double Temp1Drift10Min { get; set; }  //炉内温度2 10Min漂移
        public double Temp2Drift10Min  { get; set; } //炉内温度1 10Min漂移
        public double TempDriftMean { get; set; }    //炉内温度1与炉内温度2平均漂移
        /* 试验现象记录数据项(该处需要后续调整完善) */
        public bool   FlameDetected { get; set; }  = false; //记录是否检测到火焰事件
        public int    FlameDetectedTime { get; set; } = 0;  //记录首次检测到持续火焰5s的起火时间
        public int    FlameDuration { get; set; } = 0;      //记录火焰持续燃烧时间
        /* 控制器消息记录数据项 */
        public Dictionary<string,string> MasterMessages { get; set; }
    }

    public class TestMaster : ITestMaster
    {
        /* 控制器内部ID */
        public int MasterId { get; set; }
        /* 控制器工作模式指示变量 */
        public MasterWorkMode WorkMode { get; set; }
        /* 控制器工作状态指示变量 */
        public MasterStatus Status { get; set; }
        /* 试验或系统标定计时器变量 */
        public int Timer { get; set; }
        /* 试验数据定时记录计时器(用于样品试验过程中广播实时计算值) */
        protected Timer _timer;
        /* 传感器对象集合 */
        //private AppGlobal _global;
        protected SensorDictionary _sensors;
        /* IHubContext对象,用于发送实时数据广播 */
        protected IHubContext<NotificationHub> _notificationHub;
        /* 传感器数据CSV文件输出路径 */
        protected string _csvFilePath;
        /* [Recording]状态所需数据结构 */
        // 试验数据缓存(包括实时传感器数据,计算数据以及控制器消息)
        protected List<SensorDataCatch> _bufSensorData;
        // 持续火焰现象的视频片段缓存
        //...

        /* 本次试验的产品数据及试样数据缓存 */
        protected readonly IDbContextFactory<ISO11820DbContext> _contextFactory;
        protected Productmaster _productMaster;
        protected Testmaster _testmaster;        

        /* [Recording]状态 与 [Preparing]状态 与 [Ready]状态 共通数据结构*/
        // 用于计算试验开始条件及终止条件的数据缓存: 10min温度漂移
        protected Queue<double> xData10Min;   //试验计时缓存队列
        protected Queue<double> y1Data10Min;  //炉内温度1缓存队列
        protected Queue<double> y2Data10Min;  //炉内温度2缓存队列

        /* [Preparing]状态与[Ready]状态所需数据结构 */
        // 用于计算试验开始条件的数据缓存: 10Min内温度范围是否稳定(750℃±5)
        protected int _iCntStable;    //10Min温度稳定读秒,当前秒满足范围则减1,否则重置为600
        protected int _iCntDeviation; //10Min温度偏离读秒,当前秒满足范围则减1,否则重置为600
        protected int _iCntDrift;     //10Min温度漂移读秒,当前秒满足范围则减1,否则重置为600

        /* [Recording]状态数据结构 */
        protected int _iCntDriftEnd; //10Min温度漂移读秒,当前秒满足范围则减1,否则重置为600

        /* 构造函数 */
        public TestMaster(SensorDictionary sensors, IHubContext<NotificationHub> notificationHub,
            IDbContextFactory<ISO11820DbContext> contextFactory)
        {            
            _notificationHub = notificationHub;
            _contextFactory = contextFactory;
            _sensors = sensors;
            _timer = new Timer(DoWork);
            _bufSensorData = new List<SensorDataCatch>();
            xData10Min = new Queue<double>();

            //初始化用于漂移计算的时间序列
            for (int i = 0; i < 600; i++)
            {
                xData10Min.Enqueue(i);
            }
            y1Data10Min = new Queue<double>();
            y2Data10Min = new Queue<double>();
            //初始化读秒器
            _iCntStable = 600;
            _iCntDeviation = 600;
            _iCntDrift = 600;
            _iCntDriftEnd = 600;

            //初始化控制器工作模式及状态
            WorkMode = MasterWorkMode.Standby;
            Status   = MasterStatus.Idle;
        }


        /* ====================== 实现试验控制器通用接口方法 ================== */
        /* 控制器初始化函数 */
        public void OnInitialized()
        {
            //启动试验控制器并设置状态为[Idle]           
            Status = MasterStatus.Idle;
            _timer?.Change(0, 1000);
        }

        /* 定时任务函数,执行系统空闲时的任务[Idle] */
        protected virtual void DoIdle()
        {
        }

        /* 定时任务函数,执行系统升温时的任务[Preparing] */
        protected virtual void DoPreparing()
        {
        }

        /* 定时任务函数,执行系统升温时的任务[Ready] */
        protected virtual void DoReady()
        {
        }

        /* 定时任务函数,执行系统升温时的任务[Recording] */
        protected virtual void DoRecording()
        {
        }

        /* 控制器工作函数 */
        protected virtual void DoWork(object state)
        {
        }

        /* 初始化函数 */

        /* 内存清理函数 */

        /* 
         * 功能: 计算10min炉内温度漂移
         * 返回:
         *      (double,double) - (炉内温度1漂移值,炉内温度2漂移值)
         */
        protected (double,double) CaculateDrift10Min()
        {
            double[] xArray  = xData10Min.ToArray();  //时间数据序列
            double[] y1Array = y1Data10Min.ToArray(); //炉内温度1数据序列
            double[] y2Array = y2Data10Min.ToArray(); //炉内温度2数据序列
            //拟合曲线,取得斜率与截距
            (double intercept1, double slope1) = Fit.Line(xArray, y1Array); //炉内温度1拟合曲线参数
            (double intercept2, double slope2) = Fit.Line(xArray, y2Array); //炉内温度2拟合曲线参数
            //计算拟合曲线左右断点的对应温度值
            double y1_0 = slope1 * xArray[0];                   //炉内温度1拟合曲线参数左端点温度值
            double y1_1 = slope1 * y1Array[y1Array.Length - 1]; //炉内温度1拟合曲线参数右端点温度值

            double y2_0 = slope2 * xArray[0];                   //炉内温度2拟合曲线参数左端点温度值
            double y2_1 = slope2 * y2Array[y2Array.Length - 1]; //炉内温度2拟合曲线参数右端点温度值
            //计算温度漂移值并返回
            //return (Math.Abs(slope1 * (y1_1 - y1_0)),Math.Abs(slope2 * (y2_1 - y2_0)));
            return (Math.Abs(slope1 * 599), Math.Abs(slope2 * 599));
        }

        /*
         * 功能: 清理试验数据缓存
         */
        protected void ClearDataCatch()
        {
            _bufSensorData.Clear();
        }

        public void CreateCalibration()
        {
            throw new NotImplementedException();
        }

        public void CreateTest()
        {
            throw new NotImplementedException();
        }

        /*
         * 功能: 开始试验并记录传感器数据,计算实时值并通过SignalR进行广播
         */
        public void StartRecording()
        {
            /* 开始样品试验前的初始化工作 */
            //重置计时器
            Timer = 0;
            //修改试验控制器状态为[Recording]
            Status = MasterStatus.Recording;
        }

        public void StopRecording()
        {
            //重置计时器
            Timer = 0;
            //修改试验控制器状态为[Preparing],根据具体试验任务确定
            Status = MasterStatus.Preparing;
        }

        /*
         * 功能: 设置控制器开始升温(执行控制单元指令切换)
         */
        public void StartPreparing()
        {
            //修改试验控制器状态为[Preparing],根据具体试验任务确定
            Status = MasterStatus.Preparing;
        }

        public virtual void SetProductData(Productmaster prodmaster)
        {
            throw new NotImplementedException();
        }

        public virtual void SetTestData(Testmaster testmaster)
        {
            throw new NotImplementedException();
        }

        /*
         * 功能: 更新本次试验现象记录
         * 参数:
         *      phenocode - 主要现象编码
         *      memo      - 其他现象文字描述
         */
        public void SetPhenomenon(string phenocode, string memo)
        {
            throw new NotImplementedException();
        }

        /*
         * 功能: 判断试验条件是否满足
         */
        public virtual bool CheckStartCriteria()
        {
            throw new NotImplementedException();
        }

        /*
         * 功能: 判断试验终止条件是否满足
         */
        public virtual bool CheckTerminateCriteria()
        {
            throw new NotImplementedException();
        }

        /* 试验完成后期数据处理函数 */
        public virtual void PostTestProcess()
        {
            throw new NotImplementedException();
        }

        /* ======================= ISO11820 独有的函数 ================ */
        /* 取得当前试验控制器对应的传感器数据当前值 */
        protected virtual SensorDataCatch FetchSensorData()
        {
            return new SensorDataCatch();
        }

        /*
         * 功能: 设置当前试验样品的残余质量
         * 参数:
         *      mass - 样品残余质量
         */
        public void SetPostMass(double mass)
        {
        }        
    }
}
