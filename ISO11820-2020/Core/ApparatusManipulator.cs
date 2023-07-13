using System.IO.Ports;
using FluentModbus;

namespace TestServer.Core
{
    public enum ApparatusStatus
    {
        Pid,
        Manual
    }
    /* 
     * 类型定义: 该类型定义操作试验设备动作部件的基本功能 
     */
    public class ApparatusManipulator
    {
        private string _pidPort = string.Empty;
        private string _powerPort = string.Empty;
        private int _unitIdentifier = 0x01;
        //设备当前工作模式(0:PID | 1:手动)
        public ApparatusStatus apparatusStatus { get; set; }
        //PID控制器通信端口
        private ModbusRtuClient _pidClient;
        //恒功率控制器通信端口
        private ModbusRtuClient _powerClient;
        //PID控制温度(默认为750℃)
        public Int16 Temperature { get; set; }
        //恒功率输出值(值域: 900 - 4096)
        public Int16 ConstPower { get; set; }

        public ApparatusManipulator(string pidport,string powerport, Int16 constPower, Int16 temperature = 750)
        {
            _pidPort = pidport;
            _powerPort = powerport;
            apparatusStatus = ApparatusStatus.Manual;
            //初始化PID控制器连接
            _pidClient = new();
            _pidClient.BaudRate = 9600;
            _pidClient.Parity = Parity.None;
            _pidClient.StopBits = StopBits.Two;
            _pidClient.ReadTimeout = 1000;
            _pidClient.WriteTimeout = 1000;
            //初始化恒功率控制器连接
            //_powerClient = new();
            //_powerClient.BaudRate = 9600;
            //_powerClient.Parity = Parity.None;
            //_powerClient.StopBits = StopBits.Two;
            //_powerClient.ReadTimeout = 1000;
            //_powerClient.WriteTimeout = 1000;
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
            _pidClient.Connect(_pidPort);
            //_powerClient.Connect(_powerPort);
            //if(_pidClient.IsConnected && _powerClient.IsConnected) {
            if (_pidClient.IsConnected) {
                //设置PID控温器的目标控制温度为750℃
                _pidClient.WriteSingleRegister(_unitIdentifier,0x0000, Convert.ToInt16(Temperature * 10));
                //设置PID控制器手动控制输出比例为0
                SetOutputPower(0);
                //设置PID控制器初始控制方式为手动控制
                SwitchToManual();
                //_powerClient.WriteSingleRegister(_unitIdentifier, 0x0002, ConstPower);
                return true;
            } else {
                return false;
            }
        }

        /*
         * 功能: 更新恒功率值
         * 说明: 该函数由SetOutputPower替代
         */
        //public void UpdateConstPower(Int16 newvalue)
        //{
        //    ConstPower = newvalue;
        //    //向电力调整器发送更新输出指令
        //    if (_powerClient.IsConnected)
        //        _powerClient.WriteSingleRegister(_unitIdentifier, 0x0002, ConstPower);
        //}

        /* =========定义设备的执行动作函数,这些函数使用设备的通信端口发送控制指令 ========== */

        /*
         * 功能: 开始加热(软起动方式,初始功率30%)
         */
        public void StartHeating()
        {
            //设置电力调整器输出为0
            //if (_powerClient.IsConnected)
            //    _powerClient.WriteSingleRegister(_unitIdentifier, 0x0002, 0);
            //根据当前温度阶段设置起始加热功率(软起动),当温度达到745℃时切换至PID控温
            if (_pidClient.IsConnected) {                
                ushort curTemp = GetCurrentTemp();
                if (curTemp < 1000)
                {
                    SwitchToManual();
                    SetOutputPower(5120); // 20%输出功率
                }
                else if (curTemp < 3000)
                {
                    SwitchToManual();
                    SetOutputPower(6400); // 25%输出功率
                }
                else if (curTemp < 5000)
                {
                    SwitchToManual();
                    SetOutputPower(10240); // 40%输出功率
                }
                else if (curTemp < 7000)
                {
                    SwitchToManual();
                    SetOutputPower(12800); // 50%输出功率
                } 
                else if (curTemp < 7450)
                {
                    SwitchToManual();
                    SetOutputPower(15360); // 60%输出功率
                } 
                else 
                {
                    SwitchToPID(); // 以目标控制温度执行PID控温
                }                    
            }                
        }

        /*
         * 功能: 停止加热(切断炉体供电)
         */
        public void StopHeating()
        {
            /* 停止PID温控器输出 */
            //修改PID控制器为手动输出
            if (_pidClient.IsConnected)
            {
                _pidClient.WriteSingleRegister(_unitIdentifier, 0x0038, 3);
                //设置手动控制时输出比例为0(默认已经为0)
                _pidClient.WriteSingleRegister(_unitIdentifier, 0x0002, 0);
            }                
            //停止电力调整器输出
            //if (_powerClient.IsConnected)
            //    _powerClient.WriteSingleRegister(_unitIdentifier, 0x0002, 0);
        }

        /*
         * 功能: 将当前加热方式切换至PID方式
         */
        public void SwitchToPID()
        {
            //设置电力调整器输出为0
            //if (_powerClient.IsConnected)
            //    _powerClient.WriteSingleRegister(_unitIdentifier, 0x0002, 0);
            if(apparatusStatus == ApparatusStatus.Pid) 
                return;
            //设置PID温控器工作方式为Auto,目标温度为750℃
            if (_pidClient.IsConnected)
            {
                _pidClient.WriteSingleRegister(_unitIdentifier, 0x0038, 4);
                apparatusStatus = ApparatusStatus.Pid;
            }                
        }

        /*
         * 功能: 将PID控制器切换至手动控制模式
         */
        public void SwitchToManual()
        {
            if (apparatusStatus == ApparatusStatus.Manual)
                return;
            if (_pidClient.IsConnected)
            {
                _pidClient.WriteSingleRegister(_unitIdentifier, 0x0038, 3);
                apparatusStatus = ApparatusStatus.Manual;
            }                
        }

        /*
         * 功能: 将当前加热方式切换至恒功率方式
         */
        public void SwitchToConstPower()
        {
            //设置PID温控器工作方式为手动
            if (_pidClient.IsConnected)
                _pidClient.WriteSingleRegister(_unitIdentifier, 0x0038, 3);
            //设置手动控制时输出比例为0(默认已经为0)
            //PidPort.WriteSingleRegister(0x0002, 0);

            //设置电力调整器输出为设定的恒功率值
            //if (_powerClient.IsConnected)
            //    _pidClient.WriteSingleRegister(_unitIdentifier, 0x0002, ConstPower);
        }

        /*
         * 功能: 设置手动控制时输出比例(0-25600 对应 0%-100%)
         * 参数:
         *       value - 要设定为的输出比例
         */
        public void SetOutputPower(ushort value)
        {
            _pidClient.WriteSingleRegister(_unitIdentifier, 0x0002, value);
        }

        /*
         * 功能: 获取当前控制输出比例
         */
        public ushort GetCurrentOutput()
        {
           return _pidClient.ReadHoldingRegisters<ushort>(_unitIdentifier, 0x0101, 1)[0];
        }

        /*
         * 功能: 获取控温热电偶当前温度值
         */
        public ushort GetCurrentTemp()
        {
            return _pidClient.ReadHoldingRegisters<ushort>(_unitIdentifier, 0x0102, 1)[0];
        }
    }
}
