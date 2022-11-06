using Microsoft.AspNetCore.SignalR;
using TestServer.Global;
using TestServer.Hubs;
using TestServer.Models;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace TestServer.Core
{
    public class TestMaster3 : TestMaster
    {
        public TestMaster3(SensorDictionary sensors, IHubContext<NotificationHub> notificationHub,
            IDbContextFactory<ISO11820DbContext> contextFactory)
            : base(sensors, notificationHub, contextFactory)
        {
            //设置试验控制器ID - 对应三号试验炉
            MasterId = 2;
        }

        //重载空闲状态线程函数,发送属于三号炉的温度传感器数据
        //protected override void DoIdle(object state)
        //{            
        //}

        // 重载传感器数据获取函数
        protected override SignalRCatch FetchSensorData()
        {
            //取得该试验控制器需要的传感器数据
            SignalRCatch data = new SignalRCatch()
            {
                MasterId = MasterId,
                Timer = 0,
                Temp1 = _sensors.Sensors[0].Outputvalue,
                Temp2 = _sensors.Sensors[0].Outputvalue,
                TempSuf = _sensors.Sensors[0].Outputvalue,
                TempCen = _sensors.Sensors[0].Outputvalue,
                Temp1Drift10Min = 8888,
                Temp2Drift10Min = 8888,
                MasterMessages = new Dictionary<string, string>()
            };
            return data;
        }

        //试验控制器工作函数(状态机)
        protected override void DoWork(object state)
        {
            base.DoWork(state);

            //用于发送广播消息的JSON字符串缓存
            string jsonData = string.Empty;
            //炉内温度1和炉内温度2取整临时变量
            int temp1, temp2;
            //10Min内,炉内温度1和炉内温度2最大值与平均值临时变量
            double max1, max2, average1, average2;

            //从传感器获取最新数据
            var data = FetchSensorData();
            //保存传感器数据至历史记录缓存
            _bufSensorData.Add(new SensorDataCatch()
            {
                Timer = this.Timer,
                Temp1 = data.Temp1,
                Temp2 = data.Temp2,
                TempSuf = data.TempSuf,
                TempCen = data.TempCen
            });
            //调整10Min缓存数据
            y1Data10Min.Enqueue(data.Temp1);
            y2Data10Min.Enqueue(data.Temp2);
            if (y1Data10Min.Count == 601)
            {
                y1Data10Min.Dequeue();
                y2Data10Min.Dequeue();
            }
            /* 根据控制器状态驱动试验逻辑 */
            switch (Status)
            {
                case MasterStatus.Idle:      //空闲状态
                    break;
                case MasterStatus.Preparing: //PID升温状态
                case MasterStatus.Ready:     //温度平衡状态
                    /* 计算是否达到试验条件 */
                    //计算温度范围条件
                    temp1 = (int)(data.Temp1 * 10);
                    temp2 = (int)(data.Temp2 * 10);
                    if ((temp1 <= 7550 && temp1 >= 7450) && (temp2 <= 7550 && temp2 >= 7450))
                    {
                        if (_iCntStable > 0) _iCntStable--;
                    }
                    else
                    {
                        _iCntStable = 600;
                    }
                    //计算温度漂移条件
                    (data.Temp1Drift10Min, data.Temp2Drift10Min) = CaculateDrift10Min();
                    data.TempDriftMean = (data.Temp1Drift10Min + data.Temp2Drift10Min) / 2;
                    if ((int)(data.Temp1Drift10Min * 10) <= 20 && (int)(data.Temp2Drift10Min * 10) <= 20)
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
                    //判断是否达到开始试验的条件
                    if (_iCntStable == 0 && _iCntDrift == 0 && _iCntDeviation == 0)
                    {
                        Status = MasterStatus.Ready;
                    }
                    else
                    {
                        Status = MasterStatus.Preparing;
                    }
                    break;
                case MasterStatus.Recording: //试验中状态
                    data.Timer = Timer;
                    //计算【计算数据】            
                    (data.Temp1Drift10Min, data.Temp2Drift10Min) = CaculateDrift10Min();
                    data.TempDriftMean = (data.Temp1Drift10Min + data.Temp2Drift10Min) / 2;
                    // 计时到达60Min,无条件终止本次试验
                    if (Timer == 3600)
                    {
                        /* 执行终止本次试验的操作 */
                        //设置控制器状态为[Preparing],并重置10分钟读秒控制变量
                        _iCntStable = 600;
                        _iCntDrift = 600;
                        _iCntDeviation = 600;
                        Status = MasterStatus.Preparing;
                        //设置客户端消息: 本次试验已完成
                        data.MasterMessages.Add("date", "本次试验已完成");
                    }
                    // 在试验标准要求的时间点判断是否满足试验终止条件
                    if (Timer == 1800 || Timer == 2100 || Timer == 2400
                        || Timer == 2700 || Timer == 3000 || Timer == 3300)
                    {
                        //判断试验终止条件是否满足                        
                        if ((int)(data.Temp1Drift10Min * 10) <= 20 && (int)(data.Temp2Drift10Min * 10) <= 20)
                        {
                            /* 执行终止本次试验的操作 */
                            //设置控制器状态为[Preparing],并重置10分钟读秒控制变量
                            _iCntStable = 600;
                            _iCntDrift = 600;
                            _iCntDeviation = 600;
                            Status = MasterStatus.Preparing;
                            //设置客户端消息: 本次试验已完成
                            data.MasterMessages.Add("date", "本次试验已完成");
                        }
                    }
                    //增加计时器
                    Timer++;
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
