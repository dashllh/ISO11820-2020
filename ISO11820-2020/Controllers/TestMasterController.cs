using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Hosting;
using TestServer.Core;
using TestServer.Models;
using TestServer.Global;
using Microsoft.EntityFrameworkCore;
using ISO11820_2020.Models;
using Microsoft.EntityFrameworkCore.Internal;
using Microsoft.VisualBasic;
using OfficeOpenXml;
using Microsoft.Office.Interop.Excel;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Diagnostics;

namespace TestServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TestMasterController : ControllerBase
    {
        //指示四个试验控制器对象是否已经初始化并添加到容器对象
        static bool bMasterInitialized = false;
        //试验控制器容器对象
        private TestMasters _testMasters;
        //应用程序全局对象集合
        //private AppGlobal _global;
        //数据库上下文对象
        private readonly IDbContextFactory<ISO11820DbContext> _contextFactory;
        //服务器环境对象
        private IWebHostEnvironment _Environment;
        /*
         * 功能: 试验控制器构造函数
         * 参数:
         *      testMasters - 控制器容器对象(由DI系统提供)
         *      testMaster1 - 一号试验炉控制器对象(由DI系统提供)
         *      testMaster2 - 二号试验炉控制器对象(由DI系统提供)
         *      testMaster3 - 三号试验炉控制器对象(由DI系统提供)
         *      testMaster4 - 四号试验炉控制器对象(由DI系统提供)     
         */
        public TestMasterController(TestMasters testMasters, TestMaster1 testMaster1,
            TestMaster2 testMaster2, TestMaster3 testMaster3, TestMaster4 testMaster4,
            IDbContextFactory<ISO11820DbContext> contextFactory, IWebHostEnvironment Environment)
        {
            //_global = global;   
            _testMasters = testMasters;
            //初始化数据库上下文对象
            _contextFactory = contextFactory;
            //初始化服务器环境对象
            _Environment = Environment;
            if (!bMasterInitialized)
            {                
                //添加四个试验控制器对象,对应四个试验炉
                _testMasters.addMaster(testMaster1);
                _testMasters.addMaster(testMaster2);
                _testMasters.addMaster(testMaster3);
                _testMasters.addMaster(testMaster4);
                //开启每个控制器的数据采集线程
                foreach (var master in _testMasters.DictTestMaster.Values)
                {
                    master.OnInitialized();
                }
                //设置控制器初始化完成标记
                bMasterInitialized = true;
            }
        }

        // GET: api/<TestMasterController>
        /*
            功能: 返回四个试验控制器的基本信息
         */
        [HttpGet]
        public IEnumerable<string> Get()
        {
            //返回四个试验控制器的ID
            return new string[] {
                _testMasters.DictTestMaster[0].MasterId.ToString(),
                _testMasters.DictTestMaster[1].MasterId.ToString(),
                _testMasters.DictTestMaster[2].MasterId.ToString(),
                _testMasters.DictTestMaster[3].MasterId.ToString()
            };
        }

        // GET api/<TestMasterController>/5
        /*
            功能: 返回指定ID试验控制器的当前信息
            参数: 
                id - 试验控制器ID(0-4,对应一号炉到四号炉的试验控制器编号)
         */
        [HttpGet("{id}")]
        public string Get(int id)
        {
            return _testMasters.DictTestMaster[id].MasterId.ToString();
        }

        //一台试验控制器的情况
        //[HttpGet("startidle")]
        //public void StartIdle()
        //{
        //    _testMaster.OnInitialized();
        //}

        //测试代码:多台试验控制器的情况
        [HttpGet("startidle/{id}")]
        public void StartIdle(int id)
        {
            _testMasters.DictTestMaster?[id].OnInitialized();            
        }

        // POST api/<TestMasterController>
        [HttpGet("startrecording")]
        public void StartRecording()
        {
            //_testMaster.StartRecording();
            //测试代码
            //MyData myData = obj;
            //if (myData.Name == "dash")
            //{
            //    _testMaster.StartRecording();
            //}
            //else
            //{
            //    _testMaster.StopRecording();
            //}
        }

        //系统登录
        [HttpPost("login")]
        public IActionResult ProcessLogin([FromForm] LoginData login)
        {
            if (login.UserName.Equals("dash") && login.Password.Equals("121"))
                return new JsonResult("manager");
            else
                return new JsonResult("operator");
        }

        /* 样品试验操作相关接口函数定义 */

        /*
         * 功能: 新建试验 
         * 参数:
         *      id:int - 试验控制器ID
         *      data:JSON - 新建试验相关信息
         */
        [HttpPost("newtest/{id}")]
        public async Task<IActionResult> NewTest(int id, [FromBody] NewTestData data)
        {
            int _masterId = id;
            Message msg = new Message();
            msg.Param = new Dictionary<string, object>();
            msg.Cmd = "newtest";
            /* 检查是否第一次创建该样品的试验 */
            var ctx = _contextFactory.CreateDbContext();
            Productmaster productmaster = new Productmaster();
            productmaster.Productid = data.SmpId;
            productmaster.Productname = data.SmpName;
            productmaster.Specific = data.SmpSpec;
            productmaster.Height = data.SmpHeight;
            productmaster.Diameter = data.SmpDiameter;

            _testMasters.DictTestMaster?[_masterId].SetProductData(productmaster);
            //第一次创建该产品的试验,新增产品信息
            if (!ctx.Productmasters.Any(prod => (prod.Productid == data.SmpId)))
            {                
                ctx.Productmasters.Add(productmaster);
                await ctx.SaveChangesAsync();
            }
            //判断试验编号是否重复(重复则返回提示信息)
            if(!ctx.Testmasters.Any(test => (test.Productid == data.SmpId && test.Testid == data.TestId)))
            {
                //样品编号及试验编号没有重复,创建并设置控制器内部数据缓存
                var testmaster = new Testmaster();                
                testmaster.Productid = data.SmpId;
                testmaster.Testid = data.TestId;
                testmaster.Ambtemp = data.AmbTemp;
                testmaster.Ambhumi = data.AmbHumi;
                testmaster.Testdate = DateTime.Parse(data.TestDate);
                testmaster.According = data.TestAccord;
                testmaster.Operator = data.Operator;
                testmaster.Apparatusid = data.ApparatusId;
                testmaster.Apparatusname = data.ApparatusName;
                testmaster.Apparatuschkdate = DateTime.Parse(data.ApparatusChkDate);
                testmaster.Constpower = data.ConstPower;
                testmaster.Rptno = data.SmpId;  //(暂时将报告编号自动设置为样品编号)
                testmaster.Preweight = data.SmpWeight;
                testmaster.Phenocode = "0000";
                testmaster.Memo = data.TestMemo;

                _testMasters.DictTestMaster?[_masterId].SetTestData(testmaster);
                //设置控制器状态为[Preparing],开始升温
                _testMasters.DictTestMaster?[id].StartPreparing();

                //设置客户端返回消息
                msg.Ret = "0";
                msg.Msg = "创建新试验成功。";
                msg.Param.Add("masterid", _masterId);
                msg.Param.Add("smpid", testmaster.Productid);
                msg.Param.Add("testid", testmaster.Testid);
            } else {
                //样品编号及试验编号重复,返回错误提示                
                msg.Ret = "-1";
                msg.Msg = "样品标识号(试验编号)重复,请检查输入。";
                msg.Param.Add("masterid", _masterId);
            }

            return new JsonResult(msg);
        }

        /*
         * 功能:开始计时
         * 参数:
         *      id:int - 试验控制器ID
         */
        [HttpGet("starttimer/{id}")]
        public IActionResult StartTimer(int id)
        {
            int _masterId = id;
            _testMasters.DictTestMaster?[id].StartRecording();
            Message msg = new Message();
            msg.Param = new Dictionary<string, object>();
            msg.Cmd = "starttimer";
            msg.Ret = "0";
            msg.Msg = "计时开始。";
            msg.Param.Add("masterid", _masterId);
            msg.Param.Add("time", DateTime.Now.ToString("HH:mm"));

            return new JsonResult(msg);
        }

        /*
         *  功能: 停止计时
         */
        [HttpGet("stoptimer/{id}")]
        public IActionResult StopTimer(int id)
        {
            _testMasters.DictTestMaster?[id].StopRecording();

            Message msg = new Message();
            msg.Param = new Dictionary<string, object>();
            msg.Cmd = "stoptimer";
            msg.Ret = "0";
            msg.Msg = "计时结束。";
            msg.Param.Add("time", DateTime.Now.ToString("HH:mm"));

            return new JsonResult(msg);
        }

        /*
         * 功能: 取消当前试验
         */
        [HttpGet("canceltest/{id}")]
        public IActionResult CancelTest(int id)
        {
            //执行取消本次试验的控制器相关操作
            //...

            Message msg = new Message();
            msg.Param = new Dictionary<string, object>();
            msg.Cmd = "canceltest";
            msg.Ret = "0";
            msg.Msg = "本次试验已取消。";
            msg.Param.Add("time", DateTime.Now.ToString("HH:mm"));

            return new JsonResult(msg);
        }

        /*
         * 功能: 停止不燃炉加热
         * 参数:
         *      id - 试验控制器ID
         */
        [HttpGet("stopheating/{id}")]
        public IActionResult StopHeating(int id)
        {
            //执行停止不燃炉加热的相关操作
            //...

            Message msg = new Message();
            msg.Param = new Dictionary<string, object>();
            msg.Cmd = "stopheating";
            msg.Ret = "0";
            msg.Msg = "不燃炉已停止加热。";
            msg.Param.Add("time", DateTime.Now.ToString("HH:mm"));

            return new JsonResult(msg);
        }

        /*
         * 功能: 设置试验后样品残余质量
         * 参数:
         *      id   - 试验控制器索引
         *      mass - 当前试验样品的残余质量
         */
        [HttpPost("setpostdata/{id}")]
        public async Task<IActionResult> SetPostData(int id,[FromBody] PostTestData postdata)
        {
            //设置当前试验样品的残余质量及火焰信息
            if(postdata.Flame) {
                _testMasters.DictTestMaster[id].SetPostTestData(postdata.FlameTime,
                postdata.FlameDur, postdata.PostWeight);
            } else {
                _testMasters.DictTestMaster[id].SetPostTestData(0,0, postdata.PostWeight);
            }            
            //执行试验后期处理并生成本次试验的数据及报告文件
            await _testMasters.DictTestMaster[id].PostTestProcess();
            //构造返回消息
            Message msg = new Message();
            msg.Param = new Dictionary<string, object>();
            msg.Cmd = "setpostmass";
            msg.Ret = "0";
            msg.Msg = "已设置试样残余质量并生成试验报告。";
            msg.Param.Add("time", DateTime.Now.ToString("HH:mm"));

            return new JsonResult(msg);
        }

        /*
         * 功能: 获取试验数据列表
         * 参数:
         *       productid - 样品编码
         * 返回:
         *       testlist  - 样品对应的试验信息列表
         */
        [HttpGet("gettestinfo/{productid}")]
        public async Task<IList<ViewTestInfo>> GetTestInfo(string productid)
        {
            IList<ViewTestInfo> result = null;
            //初始化全局对象中的传感器集合对象
            var ctx = _contextFactory.CreateDbContext();
            result = await ctx.ViewTestInfos.Where(x => x.Productid == productid).ToListAsync();
            return result;
        }

        /*
         * 功能: 更新指定样品编号的试验明细的残余质量,并根据指定的明细生成汇总试验报告
         * 参数:
         *       postdata:JSON Array - 试验明细数据
         */
        [HttpPost("getfinalreport")]
        public async Task<IActionResult> GetFinalReport([FromBody] FinalReportData postdata)
        {
            /* 申明操作Excel文件的COM对象 */
            Microsoft.Office.Interop.Excel.Application oXL = null;
            Microsoft.Office.Interop.Excel.Workbooks oWBs = null;
            Microsoft.Office.Interop.Excel.Workbook oWB = null;
            Microsoft.Office.Interop.Excel.Worksheet oSheet = null;
            /* 更新数据库中对应样品编号的试验明细数据的残余质量 */
            var ctx = _contextFactory.CreateDbContext();
            var records = await ctx.Testmasters.Where(x => x.Productid == postdata.Details[0].Productid).ToListAsync();
            foreach (var item in records)
            {
                foreach (var detail in postdata.Details)
                {
                    if(item.Testid == detail.Testid)
                    {
                        item.Postweight = detail.Postweight;
                        break;
                    }
                }
            }
            await ctx.SaveChangesAsync();

            /* 生成汇总报告 */
            //设置EPPlus license版本为非商用版本
            ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
            //设置CSV文件格式
            var format = new ExcelTextFormat()
            {
                Delimiter = ',',
                EOL = "\r"       // DEFAULT IS "\r\n";
                                 // format.TextQualifier = '"';
            };
            //打开汇总报表模板
            using (ExcelPackage package = new ExcelPackage(new FileInfo($"D:\\ISO11820\\template_report_final.xlsx")))
            {
                //取得main页面
                ExcelWorksheet sheet_main = package.Workbook.Worksheets.ElementAt(0);
                /* 设置报表表头数据项 */
                //实验室温度
                sheet_main.Cells["B5"].Value = postdata.Details[0].Ambtemp;
                //实验室湿度
                sheet_main.Cells["E5"].Value = postdata.Details[0].Ambhumi;
                //试验日期
                sheet_main.Cells["H5"].Value = postdata.Details[0].Testdate;
                //试验人员
                sheet_main.Cells["K5"].Value = postdata.Details[0].Operator;
                //产品名称
                sheet_main.Cells["B6"].Value = postdata.Details[0].Productname;
                //规格型号
                sheet_main.Cells["B7"].Value = postdata.Details[0].Specific;
                //样品编号
                sheet_main.Cells["K6"].Value = postdata.Details[0].Productid;
                //报告编号
                sheet_main.Cells["K7"].Value = postdata.Details[0].Rptno;
                /* 设置试验明细数据项 */
                /* 第一条明细 */
                //直径1
                sheet_main.Cells["B15"].Value = postdata.Details[postdata.Indexes[0]].Diameter;
                //高度1
                sheet_main.Cells["C15"].Value = postdata.Details[postdata.Indexes[0]].Height;
                //烧前质量1
                sheet_main.Cells["D15"].Value = postdata.Details[postdata.Indexes[0]].Preweight;
                //烧后质量1
                sheet_main.Cells["E15"].Value = postdata.Details[postdata.Indexes[0]].Postweight;
                //炉温1
                sheet_main.Cells["F15"].Value = 750;
                //最高温度TF1
                sheet_main.Cells["G15"].Value = postdata.Details[postdata.Indexes[0]].Maxtf1;
                //最高温度TF2
                //...
                ////最高温度TS1
                //sheet_main.Cells["K7"].Value = postdata.Details[0].Rptno;
                ////最高温度TC1
                //sheet_main.Cells["K7"].Value = postdata.Details[0].Rptno;
                ////最高温度时间TF1
                //sheet_main.Cells["K7"].Value = postdata.Details[0].Rptno;
                ////最高温度时间TF2
                ////...
                ////最高温度时间TS1
                //sheet_main.Cells["K7"].Value = postdata.Details[0].Rptno;
                ////最高温度时间TC1
                //sheet_main.Cells["K7"].Value = postdata.Details[0].Rptno;
                ////终平衡温度TF1
                //sheet_main.Cells["K7"].Value = postdata.Details[0].Rptno;
                ////终平衡温度TF2
                ////...
                ////终平衡温度TS1
                //sheet_main.Cells["K7"].Value = postdata.Details[0].Rptno;
                ////终平衡温度TC1
                //sheet_main.Cells["K7"].Value = postdata.Details[0].Rptno;
                ////终温时间
                //sheet_main.Cells["K7"].Value = postdata.Details[0].Rptno;
                ////温升TF1
                //sheet_main.Cells["K7"].Value = postdata.Details[0].Rptno;
                ////温升TF2
                ////...
                ////温升TS1
                //sheet_main.Cells["K7"].Value = postdata.Details[0].Rptno;
                ////温升TC1
                //sheet_main.Cells["K7"].Value = postdata.Details[0].Rptno;
                ////起火时间
                //sheet_main.Cells["K7"].Value = postdata.Details[0].Rptno;
                ////火焰持续时间
                //sheet_main.Cells["K7"].Value = postdata.Details[0].Rptno;
                ////失重
                //sheet_main.Cells["K7"].Value = postdata.Details[0].Rptno;
                ////失重率
                //sheet_main.Cells["K7"].Value = postdata.Details[0].Rptno;

                /* 第二条明细 */
                //直径2
                sheet_main.Cells["B16"].Value = postdata.Details[postdata.Indexes[1]].Diameter;
                //高度2
                sheet_main.Cells["C16"].Value = postdata.Details[postdata.Indexes[1]].Height;
                //烧前质量2
                sheet_main.Cells["D16"].Value = postdata.Details[postdata.Indexes[1]].Preweight;
                //烧后质量2
                sheet_main.Cells["E16"].Value = postdata.Details[postdata.Indexes[1]].Postweight;
                //炉温2
                sheet_main.Cells["F16"].Value = 750;
                //最高温度TF1
                sheet_main.Cells["G16"].Value = postdata.Details[postdata.Indexes[1]].Maxtf1;

                /* 第三条明细 */
                //尺寸3

                /* 第四条明细 */
                //尺寸4

                /* 第五条明细 */
                //尺寸5

                //另存为汇总报表
                await package.SaveAsAsync($"D:\\ISO11820\\{postdata.Details[0].Productid}\\final_report.xlsx");
            }
            /* 使用COM接口另存为PDF格式 */
            /* (以下函数调用只适用于Windows平台,非Windows平台解决方案待定) */
            oXL = new Microsoft.Office.Interop.Excel.Application();
            oXL.Visible = false;
            oXL.DisplayAlerts = false;
            oWBs = oXL.Workbooks;
            //打开报表文件
            oWB = oWBs.Open($"D:\\ISO11820\\{postdata.Details[0].Productid}\\final_report.xlsx");
            //选中报表首页
            oSheet = (Microsoft.Office.Interop.Excel.Worksheet)oWB.Sheets.Item[1];
            //另存报表为PDF格式
            oSheet.ExportAsFixedFormat2(XlFixedFormatType.xlTypePDF, $"D:\\ISO11820\\{postdata.Details[0].Productid}\\final_report.pdf",
                Missing.Value, Missing.Value, Missing.Value, Missing.Value, Missing.Value,
                false, Missing.Value, Missing.Value);
            //关闭报表文件
            oWB.Close(false);
            oWBs.Close();
            oXL.Quit();
            //释放COM组件对象
            Marshal.FinalReleaseComObject(oSheet);
            Marshal.FinalReleaseComObject(oWB);
            Marshal.FinalReleaseComObject(oWBs);
            Marshal.FinalReleaseComObject(oXL);
            oSheet = null;
            oWB = null;
            oWBs = null;
            oXL = null;
            //垃圾回收,确保Excel进程被彻底清理
            GC.Collect();
            GC.WaitForPendingFinalizers();

            //复制报表文件至客户端下载文件夹
            string path = _Environment.WebRootPath + $"\\finalreports\\{postdata.Details[0].Productid}";
            Directory.CreateDirectory(path);
            System.IO.File.Copy($"D:\\ISO11820\\{postdata.Details[0].Productid}\\final_report.pdf",
                path + "\\final_report.pdf", true);

            //构造返回消息
            Message msg = new Message();
            msg.Param = new Dictionary<string, object>();
            msg.Cmd = "finalreport";
            msg.Ret = "0";
            msg.Msg = "已生成汇总报告。";
            msg.Param.Add("downloadpath",$"finalreports\\{postdata.Details[0].Productid}\\final_report.pdf");

            return new JsonResult(msg);
        }
    }    


    /* 定义用于Action方法调用时的数据绑定的类型 */
    //用户登录所需的信息类型
    public class LoginData
    {
        public string UserName { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
    //新建试验信息映射对象
    public class NewTestData
    {
        public float AmbTemp { get; set; }
        public float AmbHumi { get; set; }
        public string SmpId { get; set; }
        public string SmpSubId { get; set; }
        public string SmpName { get; set; }
        public string SmpSpec { get; set; }
        public float SmpHeight { get; set; }
        public float SmpDiameter { get; set; }
        public float SmpWeight { get; set; }
        public string TestId { get; set; }
        public string TestDate { get; set; }
        public string TestAccord { get; set; }
        public string Operator { get; set; }
        public string ApparatusId { get; set; }
        public string ApparatusName { get; set; }
        public string ApparatusChkDate { get; set; }
        public int ConstPower { get; set; }
        public string TestMemo { get; set; }
    }

    //试验结束后需要客户端提交的关键数据
    public class PostTestData
    {
        public bool Flame { get; set; }
        public int FlameTime { get; set; }
        public int FlameDur { get; set; }
        public double PostWeight { get; set; }
    }

    //控制器函数返回消息对象
    internal class Message
    {
        //操作命令
        public string Cmd { get; set; }
        //返回结果("0":执行成功 | "-1":执行失败)
        public string Ret { get; set; }
        //返回消息内容
        public string Msg { get; set; }
        //返回的附加参数
        public Dictionary<string, object> Param { get; set; }
    }

    //生成汇总报表的上传数据对象
    public class FinalReportData
    {
       public IList<int> Indexes { get; set; }
       public IList<ViewTestInfo> Details { get; set; }
    }
}
