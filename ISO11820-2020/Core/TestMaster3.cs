﻿using Microsoft.AspNetCore.SignalR;
using TestServer.Hubs;
using TestServer.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using ISO11820_2020.Models;

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
                MasterMessages    = new List<MasterMessage>() //消息对象
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
                    if (CheckStartCriteria())
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
                        //设置试验总时长
                        _testmaster.Totaltesttime = 3600;
                        //更新控制器状态
                        Status = MasterStatus.Complete;
                        //设置客户端消息: 本次试验已完成
                        data.MasterMessages.Add(new MasterMessage()
                        {
                            Time = DateTime.Now.ToString("HH:mm:ss"),
                            Message = "本次试验已完成。"
                        });
                    }
                    // 在试验标准要求的时间点判断是否满足试验终止条件
                    if (Timer == 1800 || Timer == 2100 || Timer == 2400
                        || Timer == 2700 || Timer == 3000 || Timer == 3300)
                    {
                        //判断试验终止条件是否满足                        
                        if (CheckTerminateCriteria())
                        {
                            //设置试验总时长
                            _testmaster.Totaltesttime = Timer;
                            //更新控制器状态
                            Status = MasterStatus.Complete;
                            //设置客户端消息: 本次试验已完成
                            data.MasterMessages.Add(new MasterMessage()
                            {
                                Time = DateTime.Now.ToString("HH:mm:ss"),
                                Message = "本次试验已完成。"
                            });
                        }
                    }
                    //增加计时器
                    Timer++;
                    break;
                case MasterStatus.Complete:  //试验结束状态
                    data.MasterStatus = (int)MasterStatus.Complete;
                    /* 重置试验控制相关数据缓存 */
                    //清零计时器
                    Timer = 0;
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
