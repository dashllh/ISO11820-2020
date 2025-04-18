﻿using CsvHelper;
using Emgu.CV;
using MathNet.Numerics;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using OfficeOpenXml;
using System.Globalization;
using System.Reflection;
using System.Runtime.InteropServices;
using TestServer.Hubs;
using TestServer.Models;
using DevExpress.Spreadsheet;
using Emgu.CV.ML;
using DevExpress.XtraPrinting;
using OfficeOpenXml.FormulaParsing;
using ISO11820_2020.Models;
using DevExpress.Xpo.DB.Helpers;

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
        public double Temp1 { get; set; }   //炉内温度1(控温温度) 
        public double Temp2 { get; set; }   //炉内温度2
        public double TempSuf { get; set; } //表面温度
        public double TempCen { get; set; } //中心温度
    }

    //定义计算数据类型
    public class CaculateDataCatch
    {
        public double Temp1Drift10Min { get; set; }  //炉内温度2 10Min漂移
        public double Temp2Drift10Min { get; set; }  //炉内温度1 10Min漂移
        public double TempDriftMean { get; set; }  //炉内温度1与炉内温度2平均漂移
    }

    //定义客户端通信(SignalR)缓存对象
    public class SignalRCatch
    {
        public int Timer { get; set; } //试验计时器
        public int MasterId { get; set; } //试验控制器ID
        public int MasterMode { get; set; } //控制器工作模式
        public int MasterStatus { get; set; } //控制器状态        
        /* 传感器数据项 */
        public SensorDataCatch sensorDataCatch { get; set; }
        /* 计算数据项 */
        public CaculateDataCatch caculateDataCatch { get; set; }
        /* 试验现象记录数据项(该处需要后续调整完善) */
        public bool FlameDetected { get; set; } = false; //记录是否检测到火焰事件
        public int FlameDetectedTime { get; set; } = 0;     //记录首次检测到持续火焰5s的起火时间
        public int FlameDuration { get; set; } = 0;     //记录火焰持续燃烧时间
        /* 控制器消息记录数据项 */
        public List<MasterMessage> MasterMessages { get; set; }
    }

    /*
     * 类型定义: 该类型定义试验控制器的基本属性与功能
     */
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
        /* [Recording]状态所需数据结构 */
        // 试验数据缓存(包括实时传感器数据,计算数据以及控制器消息)
        protected List<SensorDataCatch> _bufSensorData;
        /* 试验设备操作对象 */
        protected ApparatusManipulator _apparatusManipulator;
        /* 视频实时分析对象 */
        protected FlameAnalyzer _flameAnalyzer;
        /* 指示本次试验过程是否已经检测到持续火焰事件(每次试验只捕捉一次持续火焰事件) */
        protected bool _bFlameDetected;
        /* 当前试验过程检测到的火焰起火时间及持续时间(秒) */
        protected DateTime _iFlameTime;
        protected int _iFlameDurTime;

        /* 本次试验的产品数据及试样数据缓存 */
        protected readonly IDbContextFactory<ISO11820DbContext> _contextFactory;
        protected Productmaster _productMaster;
        protected Testmaster _testmaster;

        /* [Recording]状态 与 [Preparing]状态 与 [Ready]状态 共通数据结构 */
        //传感器采集数据缓存
        protected SensorDataCatch _sensorDataCatch;
        //计算数据缓存
        protected CaculateDataCatch _caculateDataCatch;
        // 用于计算试验开始条件及终止条件的数据缓存: 10min温度漂移
        protected Queue<double> xData10Min;   //试验计时缓存队列
        protected Queue<double> y1Data10Min;  //炉内温度1缓存队列
        protected Queue<double> y2Data10Min;  //炉内温度2缓存队列

        /* [Preparing]状态与[Ready]状态所需数据结构 */
        // 用于计算试验开始条件的数据缓存: 10Min内温度范围是否稳定(750℃±5)
        protected int _iCntStable;    //10Min温度稳定读秒,当前秒满足范围则减1,否则重置为600
        protected int _iCntDeviation; //10Min温度偏离读秒,当前秒满足范围则减1,否则重置为600
        protected int _iCntDrift;     //10Min温度漂移读秒,当前秒满足范围则减1,否则重置为600
        // PID温度控制器连续10分钟的输出值缓存(0-25600对应0-100%)
        protected Queue<int> queuePidOutput;

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
            queuePidOutput = new Queue<int>();

            _sensorDataCatch = new SensorDataCatch();
            _caculateDataCatch = new CaculateDataCatch();

            //初始化火焰事件指示变量(默认为没有发生持续火焰)及持续时间
            _bFlameDetected = false;
            _iFlameDurTime = 0;

            //初始化用于漂移计算的时间序列
            for (int i = 0; i < 600; i++)
            {
                xData10Min.Enqueue(i);
            }
            y1Data10Min = new Queue<double>();
            y2Data10Min = new Queue<double>();
            //初始化读秒器
            _iCntStable = 0;
            _iCntDeviation = 0;
            _iCntDrift = 0;

            //初始化控制器工作模式及状态
            WorkMode = MasterWorkMode.Standby;
            Status = MasterStatus.Idle;
        }

        /* ====================== 实现试验控制器通用接口方法 ================== */

        /* 控制器初始化函数 */
        public void OnInitialized()
        {
            //连接PID控温器
            if (_apparatusManipulator.EstablishConnection())
            {
                //启动试验控制器并设置状态为[Idle]           
                Status = MasterStatus.Idle;
                _timer?.Change(0, 1000);
            }
        }

        ///* 定时任务函数,执行系统空闲时的任务[Idle] */
        //protected virtual void DoIdle()
        //{
        //}

        ///* 定时任务函数,执行系统升温时的任务[Preparing] */
        //protected virtual void DoPreparing()
        //{
        //}

        ///* 定时任务函数,执行系统升温时的任务[Ready] */
        //protected virtual void DoReady()
        //{
        //}

        ///* 定时任务函数,执行系统升温时的任务[Recording] */
        //protected virtual void DoRecording()
        //{
        //}

        /* 控制器工作函数 */
        protected virtual void DoWork(object state)
        {
        }

        /* 初始化函数 */

        /* 内存清理函数 */

        /*
         * 功能: 更新恒功率值
         */
        //public void UpdateConstPower(ushort value)
        //{
        //    _apparatusManipulator.SetOutputPower(value);
        //}

        /* 
         * 功能: 计算10min炉内温度漂移
        */
        protected void CaculateDrift10Min()
        {
            double[] xArray = xData10Min.ToArray();   //时间数据序列
            double[] y1Array = y1Data10Min.ToArray(); //炉内温度1数据序列
            double[] y2Array = y2Data10Min.ToArray(); //炉内温度2数据序列
            //拟合曲线,取得斜率与截距
            (_, double slope1) = Fit.Line(xArray, y1Array); //炉内温度1拟合曲线参数
            (_, double slope2) = Fit.Line(xArray, y2Array); //炉内温度2拟合曲线参数
            //计算拟合曲线左右断点的对应温度值
            //double y1_0 = slope1 * xArray[0];                   //炉内温度1拟合曲线参数左端点温度值
            //double y1_1 = slope1 * y1Array[y1Array.Length - 1]; //炉内温度1拟合曲线参数右端点温度值

            //double y2_0 = slope2 * xArray[0];                   //炉内温度2拟合曲线参数左端点温度值
            //double y2_1 = slope2 * y2Array[y2Array.Length - 1]; //炉内温度2拟合曲线参数右端点温度值
            //计算温度漂移值
            _caculateDataCatch.Temp1Drift10Min = Math.Abs(slope1 * 599);
            _caculateDataCatch.Temp2Drift10Min = Math.Abs(slope2 * 599);
            _caculateDataCatch.TempDriftMean =
                (_caculateDataCatch.Temp1Drift10Min + _caculateDataCatch.Temp2Drift10Min) / 2;
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
         *       1.设置当前试验使用的恒功率值为: PID温度控制器连续10分钟的输出值的平均值
         *       2.向试验设备控制器发送指令,切换加热方式为手动控制方式
         */
        public bool StartRecording()
        {
            /* 开始样品试验前的初始化工作 */
            if (_apparatusManipulator.SetOutputPower(Convert.ToUInt16(queuePidOutput.Average()))
                && _apparatusManipulator.SwitchToManual())
            {
                //重置计时器
                Timer = 0;
                //修改试验控制器状态为[Recording]
                Status = MasterStatus.Recording;
                //2022-11-21 启动火焰检测
                //_flameAnalyzer.StartAnalyzing();
                return true;
            }
            return false;
        }

        public bool StopRecording()
        {
            //2022-11-20 向试验设备控制器发送指令,切换加热方式为PID控温            
            if (_apparatusManipulator.SwitchToPID())
            {
                //重置计时器
                Timer = 0;
                //修改试验控制器状态为[Preparing],根据具体试验任务确定
                Status = MasterStatus.Preparing;
                // 停止火焰检测
                //_flameAnalyzer.StopAnalyzing();
                return true;
            }
            return false;
        }

        /*
         * 功能: 设置控制器开始升温(执行控制单元指令切换)
         */
        //public void StartPreparing()
        //{
        //    //2022-11-20 向试验设备控制器发送指令,切换加热方式为PID控温
        //    _apparatusManipulator.SwitchToPID();
        //    //修改试验控制器状态为[Preparing],根据具体试验任务确定
        //    Status = MasterStatus.Preparing;
        //}

        /*
         * 功能: 启动不燃炉加热
         * 参数:
         *       无
         * 返回:
         *       0  - 设置成功,开始升温
         *       -1 - 设置失败,未开始升温
         */
        public async Task<int> StartHeatingAsync()
        {
            // 向试验设备控制器发送指令,启动试验炉加热
            var ret = await Task.Run(() => _apparatusManipulator.StartHeating());
            // 设置启动加热成功,则设置控制器状态为[Preparing]
            if(ret)
            {
                Status = MasterStatus.Preparing;
            }            
            return ret ? 0 : -1;
        }

        /*
         * 功能: 停止不燃炉加热
         */
        public int StopHeating()
        {
            //2022-11-20 向试验设备控制器发送指令,停止加热
            var ret = _apparatusManipulator.StopHeating();
            //设置停止加热成功,则修改试验控制器状态为[Preparing],根据具体试验任务确定
            if(ret)
            {
                Status = MasterStatus.Idle;
            }            
            return ret ? 0 : -1;
        }

        public virtual void SetProductData(Productmaster prodmaster)
        {
            _productMaster = prodmaster;
        }

        public virtual Productmaster GetProductData()
        {
            return _productMaster;
        }

        public virtual void ResetProductData()
        {
            _productMaster = null;
        }

        public virtual void SetTestData(Testmaster testmaster)
        {
            _testmaster = testmaster;
        }

        public virtual Testmaster GetTestData()
        {
            return _testmaster;
        }

        public virtual void ResetTestData()
        {
            _testmaster = null;
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
         * 功能: 判断试验条件是否满足(执行标准ISO 11820)
         */
        public virtual bool CheckStartCriteria()
        {
            //炉内温度1和炉内温度2取整临时变量
            int temp1, temp2;
            //10Min内,炉内温度1和炉内温度2最大值与平均值临时变量
            double max1, max2, average1, average2;
            /* 计算是否达到试验初始条件 */
            //10分钟后,漂移值缓存满,开始计算漂移值
            if (y1Data10Min.Count >= 600)
            {
                //计算温度范围条件
                temp1 = (int)(_sensorDataCatch.Temp1 * 10);
                temp2 = (int)(_sensorDataCatch.Temp2 * 10);
                if ((temp1 <= 7550 && temp1 >= 7450) && (temp2 <= 7550 && temp2 >= 7450))
                {
                    if (_iCntStable > 0) _iCntStable--;
                }
                else
                {
                    _iCntStable = 600;
                }
                //计算温度漂移条件
                if ((int)(_caculateDataCatch.Temp1Drift10Min * 10) <= 20
                    && (int)(_caculateDataCatch.Temp2Drift10Min * 10) <= 20)
                {
                    if (_iCntDrift > 0) _iCntDrift--;
                }
                else
                {
                    _iCntDrift = 600;
                }
                //计算温度偏差条件
                max1 = y1Data10Min.Max();
                max2 = y2Data10Min.Max();
                average1 = y1Data10Min.Average();
                average2 = y2Data10Min.Average();
                if ((int)(max1 - average1) <= 10 && (int)(max2 - average2) <= 10)
                {
                    if (_iCntDeviation > 0) _iCntDeviation--;
                }
                else
                {
                    _iCntDeviation = 600;
                }
                //判断是否达到试验初始条件并修改控制器状态            
                return _iCntStable == 0 && _iCntDrift == 0 && _iCntDeviation == 0;
            }
            //未满10Min的情况,默认返回false
            return false;
        }

        /*
         * 功能: 判断试验终止条件是否满足
         */
        public virtual bool CheckTerminateCriteria()
        {
            //判断试验终止条件是否满足 
            return ((int)(_caculateDataCatch.Temp1Drift10Min * 10) <= 20 &&
                 (int)(_caculateDataCatch.Temp2Drift10Min * 10) <= 20) ? true : false;
        }

        /*
         * 功能: 新版本试验计时结束后数据处理函数,
         *       使用DevExpress Office API操作Excel文件
         */
        public virtual async Task PostTestProcess()
        {
            /* 创建本地存储目录 */
            string prodpath = $"D:\\ISO11820\\{_testmaster.Productid}";
            string smppath = $"{prodpath}\\{_testmaster.Testid}";
            string datapath = $"{smppath}\\data";
            string rptpath = $"{smppath}\\report";
            try
            {
                /* 创建本次试验结果文件的存储目录 */
                //试验样品根目录
                Directory.CreateDirectory(prodpath);
                //本次试验根目录
                Directory.CreateDirectory(smppath);
                //本次试验原始数据目录
                Directory.CreateDirectory(datapath);
                //本次试验报表目录
                Directory.CreateDirectory(rptpath);

                /* 保存本次试验数据文件 */
                //传感器采集数据
                using (var writer = new StreamWriter($"{datapath}\\sensordata.csv", false))
                using (var csvwriter = new CsvWriter(writer, CultureInfo.InvariantCulture))
                {
                    //写入数据内容
                    await csvwriter.WriteRecordsAsync(_bufSensorData);
                }
                //其他数据文件(比如视频记录等)
                await _flameAnalyzer.OutputFlameFramesAsync($"{datapath}\\flamevideo.avi");

                /* 生成本次试验的报表 */
                //设置EPPlus license版本为非商用版本
                ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
                //var calculateOptions = new ExcelCalculationOption();
                //calculateOptions.AllowCircularReferences = true;
                //设置CSV文件格式
                var format = new ExcelTextFormat()
                {
                    Delimiter = ',',
                    EOL = "\r"    // 修改行尾结束符,默认为 "\r\n" ("\r"为回车符 "\n"为换行符);
                                  // 字符类型引用符 format.TextQualifier = '"';
                };
                //操作Excel文件
                using (ExcelPackage package = new ExcelPackage(new FileInfo($"D:\\ISO11820\\template_report_{MasterId}.xlsx")))
                {
                    //取得rawdata页面
                    ExcelWorksheet sheet_rawdata = package.Workbook.Worksheets.ElementAt(1);
                    //将采集数据记录拷贝至试验报表的rawdata页面(含首行标题)
                    sheet_rawdata.Cells["A1"].LoadFromText(new FileInfo($"{datapath}\\sensordata.csv"), format, null, true);
                    /* 设置报表首页部分数据 */
                    //取得报表首页页面(页面索引从 0 开始)
                    ExcelWorksheet sheet_main = package.Workbook.Worksheets.ElementAt(0);
                    //实验室温度
                    sheet_main.Cells["B5"].Value = _testmaster.Ambtemp;
                    //环境湿度
                    sheet_main.Cells["E5"].Value = _testmaster.Ambhumi;
                    //试验日期
                    sheet_main.Cells["H5"].Value = _testmaster.Testdate.ToString("d");
                    //检验人员
                    sheet_main.Cells["K5"].Value = _testmaster.Operator;
                    //产品名称
                    sheet_main.Cells["B6"].Value = _productMaster.Productname;
                    //规格型号
                    sheet_main.Cells["B7"].Value = _productMaster.Specific;
                    //样品编号
                    sheet_main.Cells["K6"].Value = _productMaster.Productid + "-" + _testmaster.Testid;
                    //报告编号
                    sheet_main.Cells["K7"].Value = _productMaster.Productid;
                    //试样直径
                    sheet_main.Cells["B15"].Value = _productMaster.Diameter;
                    //试样高度
                    sheet_main.Cells["C15"].Value = _productMaster.Height;
                    //试样试验前质量
                    sheet_main.Cells["D15"].Value = _testmaster.Preweight;
                    //试样残余质量
                    sheet_main.Cells["E15"].Value = _testmaster.Postweight;
                    //火焰起始时间
                    sheet_main.Cells["H23"].Value = _testmaster.Flametime;
                    //火焰持续时间
                    sheet_main.Cells["I23"].Value = _testmaster.Flameduration;

                    // 计算报表中所有公式                    
                    //package.Workbook.Calculate(calculateOptions);

                    //保存本次试验报表
                    //package.SaveAs($"{rptpath}\\report.xlsx");
                    await package.SaveAsAsync($"{rptpath}\\report.xlsx");
                }

                /* 使用DevExpress Office API打开报表文件、执行公式计算并回填关键数据项 */
                using (DevExpress.Spreadsheet.Workbook workbook = new())
                {
                    // 加载报表文件
                    workbook.LoadDocument($"{rptpath}\\report.xlsx", DocumentFormat.Xlsx);
                    // 计算报表中所有公式
                    workbook.CalculateFull();
                    // 取得报表首页Sheet对象(Sheet索引从0开始)
                    DevExpress.Spreadsheet.Worksheet worksheet = workbook.Worksheets[0];
                    /* 根据报表计算结果回填本次试验的【结论判定属性】 */
                    //最高温度
                    _testmaster.Maxtf1 = worksheet.Cells["G15"].Value.NumericValue;
                    //最高温度时间
                    _testmaster.Maxtf1Time = Convert.ToInt32(worksheet.Cells["J15"].Value.NumericValue);
                    //终平衡温度
                    _testmaster.Finaltf1 = worksheet.Cells["M15"].Value.NumericValue;
                    //终温时间
                    _testmaster.Totaltesttime = Convert.ToInt32(worksheet.Cells["B23"].Value.NumericValue);
                    //温升
                    //...                
                    //其他关键属性
                    //...

                    // 保存报表
                    //workbook.SaveDocument($"{rptpath}\\report.xlsx", DocumentFormat.OpenXml);
                    // 导出报表首页为PDF格式
                    PdfExportOptions options = new PdfExportOptions();
                    options.DocumentOptions.Author = "李西黎";
                    workbook.ExportToPdf($"{rptpath}\\report.pdf", options, "main");
                }

                //保存本次试验数据至试验数据库
                var ctx = _contextFactory.CreateDbContext();
                ctx.Testmasters.Add(_testmaster);
                await ctx.SaveChangesAsync();
            }
            catch (Exception)
            {
                // 输出异常日志
                // ...
                throw;
            }
        }

        /* ======================= ISO11820 独有的函数 ================ */
        /* 取得当前试验控制器对应的传感器数据当前值 */
        protected virtual void FetchSensorData()
        {
        }

        /*
         * 功能: 设置当前试验样品的残余质量
         * 参数:
         *      phenocode - 本次试验现象编码
         *      flametime - 本次试验火焰起始时间(试验计时值)
         *      flamedur  - 本次试验火焰持续时间(秒)
         *      mass - 样品残余质量
         */
        public void SetPostTestData(string phenocode, int flametime, int flamedur, double mass)
        {
            _testmaster.Phenocode = phenocode;
            _testmaster.Flametime = flametime;
            _testmaster.Flameduration = flamedur;
            _testmaster.Postweight = mass;
        }
    }
}
