using Microsoft.AspNetCore.Mvc;
using TestServer.Core;
using TestServer.Models;
using TestServer.Global;
using Microsoft.EntityFrameworkCore;

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
            IDbContextFactory<ISO11820DbContext> contextFactory)
        {
            //_global = global;   
            _testMasters = testMasters;
            //初始化数据库上下文对象
            _contextFactory = contextFactory;
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

        //测试代码: 系统登录
        [HttpPost]
        public IActionResult ProcessLogin([FromForm] MyData obj)
        {
            if (obj.Name.Equals("dash") && obj.Value.Equals("121"))
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
            _testMasters.DictTestMaster?[id].StartRecording();
            Message msg = new Message();
            msg.Param = new Dictionary<string, object>();
            msg.Cmd = "starttimer";
            msg.Ret = "0";
            msg.Msg = "计时开始。";
            msg.Param.Add("time", DateTime.Now.ToString("HH:mm"));

            return new JsonResult(msg);
        }

        /*
         *  功能: 停止计时
         */
        [HttpGet("stoptimer/{id}")]
        public void StopTimer(int id)
        {
            _testMasters.DictTestMaster?[id].StopRecording();
        }

        /*
         * 功能: 取消试验
         */
        //[HttpGet("canceltest/{id}")]

        /*
         * 功能: 停止加热
         * 参数:
         *      id - 试验控制器ID
         */
        //[HttpGet("stopheating/{id}")]

        /*
         * 功能: 设置试验后样品残余质量
         * 参数:
         *      id   - 试验控制器索引
         *      mass - 当前试验样品的残余质量
         */
        [HttpPost("setpostmass/{id}")]
        public IActionResult SetPostMass(int id,[FromBody] double mass)
        {
            //设置当前试验样品的残余质量
            _testMasters.DictTestMaster[id].SetPostMass(mass);

            return new JsonResult("operator");
        }

        //// PUT api/<TestMasterController>/5
        //[HttpPut("{id}")]
        //public void Put(int id, [FromBody] string value)
        //{
        //}

        //// DELETE api/<TestMasterController>/5
        //[HttpDelete("{id}")]
        //public void Delete(int id)
        //{
        //}
    }

    /*
     * 定义用于Action方法调用时的数据绑定的类型
     */
    //Login信息映射对象
    public class MyData
    {
        public string Name { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty;
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
    //控制器函数返回消息对象
    internal class Message
    {
        public string Cmd { get; set; }
        public string Ret { get; set; }
        public string Msg { get; set; }
        public Dictionary<string, object> Param { get; set; }
    }
}
