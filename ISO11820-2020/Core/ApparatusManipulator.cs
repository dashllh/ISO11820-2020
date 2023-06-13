using System.IO.Ports;
using EasyModbus;

namespace TestServer.Core
{
    /* 
     * 类型定义: 该类型定义操作试验设备动作部件的基本功能 
     */
    public class ApparatusManipulator
    {
        //PID控制器通信端口
        private ModbusClient PidPort;
        //恒功率控制器通信端口
        private ModbusClient PowerPort;
        //PID控制温度(默认为750℃)
        public int Temperature { get; set; }
        //恒功率输出值(值域: 900 - 4096)
        public int ConstPower { get; set; }

        public ApparatusManipulator(string pidport,string powerport, int constPower, int temperature = 750)
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
            //初始化PID控制器与电力调整器输出控制参数
            Temperature = temperature;
            ConstPower = constPower;
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
                //初始化PID控温器与电力调整器输出值
                PidPort.WriteSingleRegister(0x0000, Temperature * 10);
                PowerPort.WriteSingleRegister(0x0002, ConstPower);
                return true;
            } else {
                return false;
            }
        }

        /*
         * 功能: 更新恒功率值
         */
        public void UpdateConstPower(int newvalue)
        {
            ConstPower = newvalue;
            //向电力调整器发送更新输出指令
            if (PowerPort.Connected)
                PowerPort.WriteSingleRegister(0x0002, ConstPower);
        }

        /* =========定义设备的执行动作函数,这些函数使用设备的通信端口发送控制指令 ========== */

        /*
         * 功能: 开始加热(软起动方式,初始功率30%)
         */
        public void StartHeating()
        {
            //设置电力调整器输出为0
            if (PowerPort.Connected)
                PowerPort.WriteSingleRegister(0x0002, 0);
            //设置PID温控器工作方式为Auto,目标温度为750℃
            if (PidPort.Connected)
                PidPort.WriteSingleRegister(0x0038,4);
        }

        /*
         * 功能: 停止加热(切断炉体供电)
         */
        public void StopHeating()
        {
            /* 停止PID温控器输出 */
            //修改PID控制器为手动输出
            if (PidPort.Connected)
                PidPort.WriteSingleRegister(0x0038, 3);
            //设置手动控制时输出比例为0(默认已经为0)
            //PidPort.WriteSingleRegister(0x0002, 0);

            //停止电力调整器输出
            if (PowerPort.Connected)
                PowerPort.WriteSingleRegister(0x0002, 0);
        }

        /*
         * 功能: 将当前加热方式切换至PID方式
         */
        public void SwitchToPID()
        {
            //设置电力调整器输出为0
            if (PowerPort.Connected)
                PowerPort.WriteSingleRegister(0x0002, 0);

            //设置PID温控器工作方式为Auto,目标温度为750℃
            if (PidPort.Connected)
                PidPort.WriteSingleRegister(0x0038, 4);
        }

        /*
         * 功能: 将当前加热方式切换至恒功率方式
         */
        public void SwitchToConstPower()
        {
            //设置PID温控器工作方式为手动
            if (PidPort.Connected)
                PidPort.WriteSingleRegister(0x0038, 3);
            //设置手动控制时输出比例为0(默认已经为0)
            //PidPort.WriteSingleRegister(0x0002, 0);

            //设置电力调整器输出为设定的恒功率值
            if (PowerPort.Connected)
                PowerPort.WriteSingleRegister(0x0002, ConstPower);
        }
    }
}
