using System.IO.Ports;
using EasyModbus;

namespace TestServer.Core
{
    /* 该类型定义与试验设备通信的相关操作 */
    public class ApparatusManipulator
    {
        //PID控制器通信端口
        ModbusClient PidPort { get; set; }
        //恒功率控制器通信端口
        ModbusClient PowerPort { get; set; }

        public ApparatusManipulator(string pidport,string powerport)
        {
            //初始化PID控制器连接
            PidPort = new ModbusClient(pidport);
            PidPort.UnitIdentifier = 1;
            PidPort.Baudrate = 9600;
            PidPort.Parity = Parity.None;
            PidPort.StopBits = StopBits.Two;
            PidPort.ConnectionTimeout = 500;
            //初始化恒功率控制器连接
            PowerPort = new ModbusClient(powerport);
            PowerPort.UnitIdentifier = 1;
            PowerPort.Baudrate = 9600;
            PowerPort.Parity = Parity.None;
            PowerPort.StopBits = StopBits.Two;
            PowerPort.ConnectionTimeout = 500;
        }

        /*
         * 功能: 建立与试验设备的实际连接
         * 返回:
         *       true  - 成功连接所有接口
         *       false - 至少有一个接口连接失败
         */
        public bool EstablishConnection()
        {
            PidPort.Connect();
            PowerPort.Connect();
            if(PidPort.Connected && PowerPort.Connected) {
                return true;
            } else {
                return false;
            }                
        }

        /* =========定义设备的执行动作函数,这些函数使用设备的通信端口发送控制指令 ========== */

        /*
         * 功能: 开始加热(开始升温时即开始PID控温)
         */
        public void StartHeating()
        {
            //设置电力调整器输出为0
            //...

            //设置PID温控器工作方式为Auto,目标温度为750℃
            //...
        }

        /*
         * 功能: 停止加热(切断炉体供电)
         */
        public void StopHeating()
        {
            //停止PID温控器输出
            //...

            //停止电力调整器输出
            //...
        }

        /*
         * 功能: 将当前加热方式切换至PID方式
         */
        public void SwitchToPID()
        {
            //设置电力调整器输出为0
            //...

            //设置PID温控器工作方式为Auto,目标温度为750℃
            //...
        }

        /*
         * 功能: 将当前加热方式切换至恒功率方式
         */
        public void SwitchToConstPower()
        {
            //设置PID温控器工作方式为手动,输出值为0
            //...

            //设置电力调整器输出为设定的恒功率值
            //...
        }
    }
}
