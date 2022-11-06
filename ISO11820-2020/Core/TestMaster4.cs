using Microsoft.AspNetCore.SignalR;
using TestServer.Global;
using TestServer.Hubs;
using TestServer.Models;
using System.Text.Json;
using Microsoft.EntityFrameworkCore.Internal;
using Microsoft.EntityFrameworkCore;

namespace TestServer.Core
{
    public class TestMaster4 : TestMaster
    {
        public TestMaster4(SensorDictionary sensors, IHubContext<NotificationHub> notificationHub,
            IDbContextFactory<ISO11820DbContext> contextFactory)
            : base(sensors, notificationHub, contextFactory)
        {
            //设置试验控制器ID - 对应四号试验炉
            MasterId = 3;
        }

        //重载空闲状态线程函数,发送属于四号炉的温度传感器数据
        //protected override void DoIdle(object state)
        //{
        //    base.DoIdle(state);
        //}

        // 重载传感器数据获取函数
        protected override SensorDataCatch FetchSensorData()
        {
            //取得该试验控制器需要的传感器数据
            SensorDataCatch data = new SensorDataCatch()
            {
                Timer = 0,
                Temp1 = _sensors.Sensors[2].Outputvalue,
                Temp2 = _sensors.Sensors[2].Outputvalue,
                TempSuf = _sensors.Sensors[2].Outputvalue,
                TempCen = _sensors.Sensors[2].Outputvalue
            };
            return data;
        }

        //试验控制器工作函数(状态机)
        protected override void DoWork(object state)
        {
            base.DoWork(state);
            
        }
    }
}
