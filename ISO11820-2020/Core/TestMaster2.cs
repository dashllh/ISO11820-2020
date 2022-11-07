using Microsoft.AspNetCore.SignalR;
using TestServer.Global;
using TestServer.Hubs;
using TestServer.Models;
using System.Text.Json;
using Microsoft.EntityFrameworkCore.Internal;
using Microsoft.EntityFrameworkCore;

namespace TestServer.Core
{
    public class TestMaster2 : TestMaster
    {
        public TestMaster2(SensorDictionary sensors, IHubContext<NotificationHub> notificationHub,
            IDbContextFactory<ISO11820DbContext> contextFactory)
            : base(sensors, notificationHub, contextFactory)
        {
            //设置试验控制器ID - 对应二号试验炉
            MasterId = 1;
        }

        // 重载传感器数据获取函数
        protected override void FetchSensorData()
        {
            //取得该试验控制器需要的传感器数据
            //刷新传感器数据缓存            
            _sensorDataCatch.Timer = 0;
            _sensorDataCatch.Temp1 = _sensors.Sensors[2].Outputvalue;
            _sensorDataCatch.Temp2 = _sensors.Sensors[2].Outputvalue;
            _sensorDataCatch.TempSuf = _sensors.Sensors[2].Outputvalue;
            _sensorDataCatch.TempCen = _sensors.Sensors[2].Outputvalue;
        }

        //重载试验状态线程函数,执行二号炉的试验控制逻辑
        protected override void DoWork(object state)
        {
            base.DoWork(state);            
        }

    }
}
