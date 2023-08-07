using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using TestServer.Models;
using TestServer.Hubs;
using System.IO.Ports;
using System.Text;
using TestServer.Global;
using TestServer.Core;
using ISO11820_2020.Hubs;

namespace TestServer.Services
{
    /*
     * 类型名称: 
     *      DAQService
     * 创建时间: 
     *      2022年6月12日
     * 更新时间: 
     *      2022年12月6日
     * 功能清单:
     *      1. 初始化试验设备传感器连接(含检查传感器可用状态)
     *      2. 以小于1s的时间间隔刷新数据采集传感器最新采集数据
     */
    public class DAQService : IHostedService, IDisposable
    {        
        //日志记录对象
        private readonly ILogger<DAQService> _logger;
        //数据库上下文对象
        private readonly IDbContextFactory<ISO11820DbContext> _contextFactory;
        //传感器集合对象
        private SensorDictionary _sensors;
        //用于定时查询传感器实时值的计时器
        private Timer _timer;
        //用于间隔1秒发送校准传感器温度实时值的计时器
        private Timer _timerForCali;
        //串口读取异常计数器
        private int _counter;
        /* IHubContext对象,用于发送实时数据广播 */
        protected IHubContext<CalibrationHub> _calibrationHub;
        //串口对象
        SerialPort _serialPort;        

        //构造函数
        public DAQService(ILogger<DAQService> logger, IDbContextFactory<ISO11820DbContext> contextFactory,
            SensorDictionary sensors, IHubContext<CalibrationHub> calibrationHub)
        {
            _logger = logger;
            _contextFactory = contextFactory;
            _sensors = sensors;
            _calibrationHub = calibrationHub;
            //初始化串口对象
            _serialPort = new SerialPort("COM3", 9600, Parity.None, 8, StopBits.One);
            _serialPort.ReadTimeout = 200;  //设置读超时
            _serialPort.WriteTimeout = 200; //设置写超时
            _serialPort.Handshake = Handshake.None;
            _serialPort.NewLine = "\r"; //将默认NewLine字符('\n')改为Adam模块指令的结尾字符
            _serialPort.Encoding = Encoding.UTF8; //使用UTF8编码
            //创建定时任务(未开启)
            _timer = new Timer(DoWork);
            _timerForCali = new Timer(DoCalibration);
            //初始化串口异常计数器
            _counter = 0;
        }
        public Task StartAsync(CancellationToken cancellationToken)
        {            
            //从数据库加载传感器参数至内存
            var ctx  = _contextFactory.CreateDbContext();
            _sensors.Sensors = ctx.Sensors.ToDictionary(X => X.Sensorid);

            //测试代码: 开启定时任务
            _timer.Change(0, 800);
            _timerForCali.Change(0, 1000);

            // 部署时,将以下注释打开
            //打开串口
            //_serialPort.Open();            
            //if(_serialPort.IsOpen)
            //{
            //    //开启定时任务
            //    _timer.Change(0, 800);
            //    _timerForCali.Change(0, 1000);
            //    //记录服务开始日志
            //    _logger.LogInformation("DAQ service start working...");
            //}
            //else
            //{
            //    //打开串口失败,记录相应日志
            //    _logger.LogInformation("DAQ service starting failed...");
            //}
            return Task.CompletedTask;
        }

        public Task StopAsync(CancellationToken cancellationToken)
        {
            //记录服务停止日志
            _logger.LogInformation("DAQ service is stopping...");
            //停止定时任务
            _timer.Change(Timeout.Infinite, 0);
            _timerForCali.Change(Timeout.Infinite, 0);
            //关闭串口
            _serialPort.Close();
            if (!_serialPort.IsOpen)
            {
                //成功关闭串口,记录相应日志
                _logger.LogInformation("DAQ service serial port closed...");
            }
            else
            {
                //关闭串口失败,记录相应日志
                _logger.LogInformation("DAQ service serial port closing failed...");
            }
            return Task.CompletedTask;
        }

        /*
         * 功能: 定时从通信接口获取传感器数据并更新内存缓存(一个通信接口对应一个DoWork采集函数)
         * 说明:
         *       不同的试验设备具有不同的传感器、设备接口以及通信协议。       
         */
        private void DoWork(object state)
        {
            //遍历传感器,更新传感器输出值                        
            string cmd;
            string data = string.Empty;
            if (_serialPort.IsOpen)
            {
                try
                {
                    // 获取第一个4018+模块的通道值
                    cmd = "#01";
                    _serialPort.WriteLine(cmd);
                    data = _serialPort.ReadLine();
                    if (data.Length == 57)
                    {
                        // 设置一号试验炉温度值
                        _sensors.Sensors[0].SetInputValue(double.Parse(data.Substring(1 + 0 * 7, 7)));
                        _sensors.Sensors[2].SetInputValue(double.Parse(data.Substring(1 + 1 * 7, 7)));
                        // 设置二号试验炉温度值
                        // ...
                    }
                    // 获取第二个4018+模块的通道值
                    cmd = "#02";
                    data = string.Empty;
                    _serialPort.WriteLine(cmd);
                    data = _serialPort.ReadLine();
                    if (data.Length == 57)
                    {
                        // 设置三号试验炉温度值
                        _sensors.Sensors[0].SetInputValue(double.Parse(data.Substring(1 + 0 * 7, 7)));
                        _sensors.Sensors[2].SetInputValue(double.Parse(data.Substring(1 + 1 * 7, 7)));
                        // 设置四号试验炉温度值
                        // ...
                    }
                }
                catch(TimeoutException e)
                {
                    // 处理串口操作超时异常
                    if(++_counter == 3)
                    {
                        //连续超时3次,系统认为串口出现意外终端情况,设置对应传感器采集值为异常指示值
                        // ...
                    }
                    _logger.LogInformation(e.Message);
                }
                catch (Exception e)
                {
                    _logger.LogInformation(e.Message);
                }
            }

            //测试代码: 模拟传感器采集数据
            Random rd = new Random();
            double value = rd.Next() % 3;
            Random rd2 = new Random();
            double value2 = rd.Next() % 12;
            _sensors.Sensors[0].SetInputValue(value + 749);
            _sensors.Sensors[2].SetInputValue(value2 + 750);
        }

        private void DoCalibration(object state)
        {
            Random rd = new Random();
            double value = rd.Next() % 9;
            _calibrationHub.Clients.All.SendAsync("CaliBroadCast", value+745);
        }

        public void Dispose()
        {
            //释放对象内存
            _timer.Dispose();
            _timerForCali.Dispose();
            _serialPort.Close();
        }
    }
}