using Microsoft.AspNetCore.SignalR;
using TestServer.Global;
using TestServer.Hubs;
using TestServer.Models;
using System.Text.Json;
using CsvHelper;
using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Office.Interop.Excel;
using OfficeOpenXml;
using System.Reflection;
using System.Windows;
using Microsoft.EntityFrameworkCore.Internal;
using System.Transactions;

namespace TestServer.Core
{
    public class TestMaster1 : TestMaster
    {
        public TestMaster1(SensorDictionary sensors, IHubContext<NotificationHub> notificationHub,
            IDbContextFactory<ISO11820DbContext> contextFactory)
            : base(sensors, notificationHub, contextFactory)
        {
            //设置试验控制器ID - 对应一号试验炉
            MasterId = 0;
        }

        // 重载传感器数据获取函数
        protected override void FetchSensorData()
        {            
            //刷新传感器数据缓存            
            _sensorDataCatch.Timer = 0;
            _sensorDataCatch.Temp1 = _sensors.Sensors[0].Outputvalue;
            _sensorDataCatch.Temp2 = _sensors.Sensors[0].Outputvalue;
            _sensorDataCatch.TempSuf = _sensors.Sensors[0].Outputvalue;
            _sensorDataCatch.TempCen = _sensors.Sensors[0].Outputvalue;
        }

        //重载设置试验数据的父函数
        public override void SetProductData(Productmaster prodmaster)
        {
            _productMaster = prodmaster;
        }
        public override void SetTestData(Testmaster testmaster)
        {
            _testmaster = testmaster;
        }

        //重载试验完成后期处理函数
        //public override async void PostTestProcess()
        //{
        //    base.PostTestProcess();
            ///* 申明操作Excel文件的COM对象 */
            //Microsoft.Office.Interop.Excel.Application oXL = null;
            //Microsoft.Office.Interop.Excel.Workbooks oWBs = null;
            //Microsoft.Office.Interop.Excel._Workbook oWB = null;
            //Microsoft.Office.Interop.Excel._Worksheet oSheet = null;
            //Microsoft.Office.Interop.Excel.Range oRng = null;

            ///* 创建本地存储目录 */
            //string prodpath = $"D:\\ISO11820\\{_testmaster.Productid}";
            //string smppath = $"{prodpath}\\{_testmaster.Testid}";
            //string datapath = $"{smppath}\\data";
            //string rptpath = $"{smppath}\\report";
            ////创建样品根目录
            //Directory.CreateDirectory(prodpath);
            ////创建本次试验根目录
            //Directory.CreateDirectory(smppath);
            ////创建本次试验数据目录
            //Directory.CreateDirectory(datapath);
            ////创建本次试验报表目录
            //Directory.CreateDirectory(rptpath);
            ///* 保存试验数据文件 */
            ////传感器采集数据
            //using (var writer = new StreamWriter($"{datapath}\\sensordata.csv", false))
            //using (var csvwriter = new CsvWriter(writer, CultureInfo.InvariantCulture))
            //{
            //    //写入数据内容
            //    await csvwriter.WriteRecordsAsync(_bufSensorData);
            //}
            ////其他文件
            ////...

            ///* 生成本次试验的报表(暂时弃用) */
            ////oXL = new Microsoft.Office.Interop.Excel.Application();
            ////oXL.Visible = false;
            ////oWBs = oXL.Workbooks;
            //////打开报表模板
            ////oWB = oWBs.Open(@"D:\ISO11820\template_report.xlsx");
            //////打开CSV数据文件
            ////oWBs.OpenText($"{datapath}\\sensordata.csv", 936, 1, Microsoft.Office.Interop.Excel.XlTextParsingType.xlDelimited,
            ////   Microsoft.Office.Interop.Excel.XlTextQualifier.xlTextQualifierDoubleQuote, Missing.Value, Missing.Value, Missing.Value, true,
            ////   Missing.Value, Missing.Value, Missing.Value, Missing.Value, Missing.Value, Missing.Value,
            ////   Missing.Value, Missing.Value, Missing.Value);
            //////选中CSV文件中要复制的数据区域
            ////oSheet = (Microsoft.Office.Interop.Excel._Worksheet)oXL.Windows.Item[1].ActiveSheet;
            ////oRng = oSheet.Range["A1:E3602"];
            ////oRng.Copy();
            //////选中粘贴目标Sheet
            ////oSheet = (Microsoft.Office.Interop.Excel._Worksheet)oWB.Sheets.Item[2];
            ////oSheet.Paste("R1C1");  //粘贴至第一行第一列
            //////oXL.CutCopyMode = XlCutCopyMode.xlCopy;
            //////Clipboard.Clear();
            //////关闭CSV窗体
            ////oXL.Windows.Item[1].Close(false);
            //////保存报表
            ////oWB.SaveCopyAs($"{rptpath}\\report.xlsx");
            //////oSheet = (Microsoft.Office.Interop.Excel._Worksheet)oWB.Sheets.Item[4];
            //////oSheet.ExportAsFixedFormat2(XlFixedFormatType.xlTypePDF, "Temp.pdf",
            //////    Missing.Value, Missing.Value, Missing.Value, Missing.Value, Missing.Value,
            //////    true, Missing.Value);
            //////关闭报表模板
            ////oWB.Close(false);
            ////oWBs.Close();

            ////oXL.Quit();

            ///* 生成本次试验的报表 */
            ////设置EPPlus license版本
            //ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
            ////设置CSV文件格式参数
            //var format = new ExcelTextFormat()
            //{
            //    Delimiter = ',',
            //    EOL = "\r"       // DEFAULT IS "\r\n";
            //    // format.TextQualifier = '"';
            //};

            //using (ExcelPackage package = new ExcelPackage(new FileInfo(@"D:\ISO11820\template_report.xlsx")))
            //{
            //    //取得rawdata页面
            //    ExcelWorksheet sheet_rawdata = package.Workbook.Worksheets.ElementAt(1);
            //    //将采集数据记录拷贝至试验报表的rawdata页面(含首行标题)
            //    sheet_rawdata.Cells["A1"].LoadFromText(new FileInfo($"{datapath}\\sensordata.csv"), format, null, true);
            //    //计算中间结果及试验结果
            //    //ExcelWorksheet sheet_calcdata = package.Workbook.Worksheets.ElementAt(2);
            //    /* 设置报表首页部分数据 */
            //    //取得报表首页页面
            //    ExcelWorksheet sheet_main = package.Workbook.Worksheets.ElementAt(0);
            //    //实验室温度
            //    sheet_main.Cells["B5"].Value = _testmaster.Ambtemp;
            //    //环境湿度
            //    sheet_main.Cells["E5"].Value = _testmaster.Ambhumi;
            //    //试验日期
            //    sheet_main.Cells["H5"].Value = _testmaster.Testdate.ToString("d");
            //    //检验人员
            //    sheet_main.Cells["K5"].Value = _testmaster.Operator;
            //    //产品名称
            //    sheet_main.Cells["B6"].Value = _productMaster.Productname;
            //    //规格型号
            //    sheet_main.Cells["B7"].Value = _productMaster.Specific;
            //    //样品编号
            //    sheet_main.Cells["K6"].Value = _productMaster.Productid + "-" + _testmaster.Testid;
            //    //报告编号
            //    sheet_main.Cells["K7"].Value = _productMaster.Productid;

            //    //试样直径
            //    sheet_main.Cells["B15"].Value = _productMaster.Diameter;
            //    //试样高度
            //    sheet_main.Cells["C15"].Value = _productMaster.Height;
            //    //试样试验前质量
            //    sheet_main.Cells["D15"].Value = _testmaster.Preweight;

            //    //保存本次试验报表
            //    package.SaveAs($"{rptpath}\\report.xlsx");
            //}

            ///* 根据报表计算结果回填本次试验的【结论判定属性】 */
            ////using (ExcelPackage report = new ExcelPackage(new FileInfo($"{rptpath}\\report.xlsx")))
            ////{
            ////    //取得报表首页页面
            ////    ExcelWorksheet sheet_main = report.Workbook.Worksheets.ElementAt(0);
            ////    sheet_main.Calculate();
            ////    /* 根据报表计算结果回填本次试验的【结论判定属性】 */
            ////    //最高温度
            ////    _testmaster.Maxtf1 = Convert.ToDouble(sheet_main.Cells["G15"].Value);
            ////    //最高温度时间
            ////    _testmaster.Maxtf1Time = Convert.ToInt32(sheet_main.Cells["J15"].Value);
            ////    //终平衡温度
            ////    _testmaster.Finaltf1 = Convert.ToDouble(sheet_main.Cells["M15"].Value);
            ////    //终温时间
            ////    _testmaster.Totaltesttime = Convert.ToInt32(sheet_main.Cells["B23"].Value);

            ////    //保存本次试验数据至试验数据库
            ////    var ctx = _contextFactory.CreateDbContext();
            ////    ctx.Testmasters.Add(_testmaster);
            ////    await ctx.SaveChangesAsync();
            ////}

            //oXL = new Microsoft.Office.Interop.Excel.Application();
            //oXL.Visible = false;
            //oWBs = oXL.Workbooks;
            ////打开报表文件
            //oWB = oWBs.Open($"{rptpath}\\report.xlsx");
            ////选中报表首页
            //oSheet = (Microsoft.Office.Interop.Excel._Worksheet)oWB.Sheets.Item[1];
            ///* 根据报表计算结果回填本次试验的【结论判定属性】 */
            ////最高温度
            //_testmaster.Maxtf1 = Convert.ToDouble(oSheet.Range["G15"].Value);
            ////最高温度时间
            //_testmaster.Maxtf1Time = Convert.ToInt32(oSheet.Range["J15"].Value);
            ////终平衡温度
            //_testmaster.Finaltf1 = Convert.ToDouble(oSheet.Range["M15"].Value);
            ////终温时间
            //_testmaster.Totaltesttime = Convert.ToInt32(oSheet.Range["B23"].Value);

            ////保存本次试验数据至试验数据库
            //var ctx = _contextFactory.CreateDbContext();
            //ctx.Testmasters.Add(_testmaster);
            //await ctx.SaveChangesAsync();

            ////保存报表
            //oWB.Save();
            //oSheet.ExportAsFixedFormat2(XlFixedFormatType.xlTypePDF, $"{rptpath}\\report.pdf",
            //    Missing.Value, Missing.Value, Missing.Value, Missing.Value, Missing.Value,
            //    true, Missing.Value);
            ////关闭报表文件
            //oWB.Close(false);
            //oWBs.Close();

            //oXL.Quit();
        //}

        //重载[Idle]状态驱动函数,广播属于一号炉的温度传感器数据
        protected override void DoIdle()
        {            
        }

        //重载[Preparing]状态驱动函数,执行一号炉温度控制逻辑
        protected override void DoPreparing()
        {
        }

        //重载[Ready]状态驱动函数,执行一号炉温度控制逻辑
        protected override void DoReady()
        {
        }

        //重载[Recording]状态驱动函数,执行一号炉温度控制逻辑
        protected override void DoRecording()
        {
        }

        //试验控制器工作函数(状态机)
        protected override void DoWork(object state)
        {
            base.DoWork(state);
            //用于发送广播消息的JSON字符串缓存
            string jsonData = string.Empty;   
            //刷新传感器最新采集数据
            FetchSensorData();
            //调整10Min缓存数据
            y1Data10Min.Enqueue(_sensorDataCatch.Temp1);
            y2Data10Min.Enqueue(_sensorDataCatch.Temp2);
            if (y1Data10Min.Count == 601)
            {
                y1Data10Min.Dequeue();
                y2Data10Min.Dequeue();
                //刷新计算数据最新值
                CaculateDrift10Min();
            }            
            //创建并初始化SignalR客户端通信数据对象
            SignalRCatch data = new SignalRCatch()
            {                
                MasterId          = MasterId,           //控制器ID                
                MasterMode        = (int)WorkMode,      //控制器实时工作模式
                MasterStatus      = (int)Status,        //控制器实时状态
                Timer             = 0,                  //计时器
                sensorDataCatch   = _sensorDataCatch,   //传感器数据
                caculateDataCatch = _caculateDataCatch, //计算数据                
                MasterMessages    = new Dictionary<string, string>() //消息对象
            };

            /* 根据控制器状态驱动试验逻辑 */
            switch (Status)
            {
                case MasterStatus.Idle:      //空闲状态
                    data.MasterStatus = (int)MasterStatus.Idle;
                    break;
                case MasterStatus.Preparing: //PID升温状态
                case MasterStatus.Ready:     //温度平衡状态
                    //设置控制器工作模式及状态
                    if (Status == MasterStatus.Preparing) {
                        data.MasterStatus = (int)MasterStatus.Preparing;
                    }                        
                    if (Status == MasterStatus.Ready) {
                        data.MasterStatus = (int)MasterStatus.Ready;
                    }
                    //判断是否达到试验初始条件并修改控制器状态
                    if(CheckStartCriteria()) 
                        Status = MasterStatus.Ready;
                    else                     
                        Status = MasterStatus.Preparing;
                    break;
                case MasterStatus.Recording: //试验中状态
                    data.MasterStatus = (int)MasterStatus.Recording;
                    data.Timer = Timer;
                    _sensorDataCatch.Timer = Timer;
                    //保存传感器数据至历史记录缓存
                    _bufSensorData.Add(new SensorDataCatch()
                    {
                        Timer   = _sensorDataCatch.Timer,    //计时器
                        Temp1   = _sensorDataCatch.Temp1,    //炉内温度1
                        Temp2   = _sensorDataCatch.Temp2,    //炉内温度2
                        TempSuf = _sensorDataCatch.TempSuf,  //试样表面温度 
                        TempCen = _sensorDataCatch.TempCen   //试样中心温度
                    });                    
                    // 计时到达60Min,无条件终止本次试验
                    if (Timer == 3600)
                    {
                        Status = MasterStatus.Complete;
                        //设置客户端消息: 本次试验已完成
                        data.MasterMessages.Add(DateTime.Now.ToString("HH:mm"), "本次试验已完成");                        
                    }
                    // 在试验标准要求的时间点判断是否满足试验终止条件
                    if (Timer == 60 || Timer == 2100 || Timer == 2400
                        || Timer == 2700 || Timer == 3000 || Timer == 3300)
                    {
                        //判断试验终止条件是否满足                        
                        if (CheckTerminateCriteria())
                        {   
                            Status = MasterStatus.Complete;
                            //设置客户端消息: 本次试验已完成
                            data.MasterMessages.Add(DateTime.Now.ToString("HH:mm"), "本次试验已完成。");
                        }
                    }
                    //增加计时器
                    Timer++;
                    break;
                case MasterStatus.Complete:  //试验结束状态
                    data.MasterStatus = (int)MasterStatus.Complete;
                    /* 重置试验控制相关数据缓存 */
                    //清零计时器
                    Timer  = 0;
                    //设置控制器状态为[Preparing],自动为下一个试验做准备
                    Status = MasterStatus.Preparing;
                    //重置10分钟读秒控制变量
                    _iCntStable = 0;
                    _iCntDrift = 0;
                    _iCntDeviation = 0;
                    break;
                default:
                    break;
            }              
            //向客户端发送数据广播
            jsonData = JsonSerializer.Serialize(data);
            _notificationHub.Clients.All.SendAsync("MasterBroadCast", jsonData);            
        }
    }    
}
