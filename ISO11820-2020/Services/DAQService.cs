using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using TestServer.Models;
using TestServer.Hubs;
using System.IO.Ports;
using System.Text;
using TestServer.Global;
using TestServer.Core;

namespace TestServer.Services
{
    /*
     * 类型名称: 
     *      DAQService
     * 创建时间: 
     *      2022年6月12日
     * 更新时间: 
     *      2022年7月17日
     * 功能清单:
     *      1.初始化试验设备传感器连接(含检查传感器可用状态)
     *      2. 以小于1s的时间间隔刷新数据采集传感器最新采集数据
     *      3. 使用SignalR以1s的时间间隔将最新传感器数据向客户端广播  
     */
    public class DAQService : IHostedService, IDisposable
    {        
        //日志记录对象
        private readonly ILogger<DAQService> _logger;
        //数据库上下文对象
        private readonly IDbContextFactory<ISO11820DbContext> _contextFactory;
        //应用程序全局对象集合
        //private AppGlobal _global;
        //传感器集合对象
        private SensorDictionary _sensors;
        //用于定时查询传感器实时值的计时器
        private Timer _timer;
        //串口对象
        SerialPort _serialPort;        

        //构造函数
        public DAQService(ILogger<DAQService> logger, IDbContextFactory<ISO11820DbContext> contextFactory,
            SensorDictionary sensors)
        {
            _logger = logger;
            _contextFactory = contextFactory;
            _sensors = sensors;
            //_global = global;
            //初始化串口对象
            _serialPort = new SerialPort("COM3", 9600, Parity.None, 8, StopBits.One);
            _serialPort.ReadTimeout = 200;  //设置读超时
            _serialPort.WriteTimeout = 200; //设置写超时
            _serialPort.Handshake = Handshake.None;
            _serialPort.NewLine = "\r"; //将默认NewLine字符('\n')改为Adam模块指令的结尾字符
            _serialPort.Encoding = Encoding.UTF8; //使用UTF8编码
            //创建定时任务(未开启)
            _timer = new Timer(DoWork);
        }
        public Task StartAsync(CancellationToken cancellationToken)
        {            
            //获取采集传感器数据
            var ctx  = _contextFactory.CreateDbContext();
            //初始化全局对象中的传感器集合对象
            _sensors.Sensors = ctx.Sensors.ToDictionary(X => X.Sensorid);

            //打开串口
            //_serialPort.Open();            

            //开启定时任务
            _timer.Change(0, 800);
            //_notificationTimer?.Change(0, 1000);
            //记录服务开始日志
            _logger.LogInformation("DAQ service start working...");

            return Task.CompletedTask;
        }

        public Task StopAsync(CancellationToken cancellationToken)
        {
            //记录服务停止日志
            _logger.LogInformation("DAQ service is stopping...");
            //停止定时任务
            _timer.Change(Timeout.Infinite, 0);
            //关闭串口
            _serialPort.Close();

            return Task.CompletedTask;
        }

        //定时任务函数
        private void DoWork(object state)
        {
            //遍历传感器,更新传感器输出值                        
            string cmd = "#01";
            string data = string.Empty;
            if (_serialPort.IsOpen)
            {
                try
                {
                    _serialPort.WriteLine(cmd);
                    data = _serialPort.ReadLine();
                    if (data.Length == 57)
                    {
                        _sensors.Sensors[0].SetInputValue(double.Parse(data.Substring(1 + 0 * 7, 7)));
                        _sensors.Sensors[2].SetInputValue(double.Parse(data.Substring(1 + 1 * 7, 7)));
                    }
                }
                catch (Exception e)
                {
                    if (data.Length == 57)
                    {
                        _sensors.Sensors[0].SetInputValue(double.Parse(data.Substring(1 + 0 * 7, 7))); //获取通道0数据
                        _sensors.Sensors[2].SetInputValue(double.Parse(data.Substring(1 + 1 * 7, 7)));
                    } 
                    else
                    {
                        _logger.LogInformation(e.Message);
                    }
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
        public void Dispose()
        {
            //释放对象内存
            _timer.Dispose();
            _serialPort.Close();
        }
    }
}
