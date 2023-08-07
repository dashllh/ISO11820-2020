using System.IO.Ports;
using FluentModbus;

namespace TestServer.Core
{
    public enum ApparatusStatus
    {
        None,
        Pid,
        Manual
    }

    // PID模块操作类型
    public enum OperationType
    {
        Read,
        Write
    }
    /* 
     * 类型定义: 该类型定义操作试验设备动作部件的基本功能
     */
    public class ApparatusManipulator
    {
        private string _pidPort = string.Empty;
        private string _powerPort = string.Empty;
        private int _unitIdentifier = 0x01;

        private ushort _currentOutput; // 当前Pid控制模块的输出功率值(0-25600)(手动方式)
        private ushort _pidOutput;     // 当前Pid控制模块的输出功率值(0-25600)(Pid方式)
        private ushort _currentTemp;   // 当前控温热电偶的温度(单位:0.1)

        //设备当前工作模式(0:PID | 1:手动)
        public ApparatusStatus apparatusStatus { get; set; }
        //PID控制器通信端口
        private ModbusRtuClient _pidClient;
        //恒功率控制器通信端口
        //private ModbusRtuClient _powerClient;
        //PID控制温度(默认为750℃)
        public Int16 Temperature { get; set; }
        //恒功率输出值(值域: 900 - 4096)
        public Int16 ConstPower { get; set; }

        public ApparatusManipulator(string pidport,string powerport, Int16 constPower, Int16 temperature = 750)
        {
            _pidPort = pidport;
            _powerPort = powerport;
            apparatusStatus = ApparatusStatus.None;
            _currentOutput = 0xFFFF;
            _pidOutput = 0x6400; // 对应100%
            //初始化PID控制器连接
            _pidClient = new();
            _pidClient.BaudRate = 9600;
            _pidClient.Parity = Parity.None;
            _pidClient.StopBits = StopBits.One;
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
         *       1.设置PID控温器的目标控制温度为750℃                              
         *       2.设置PID控制器初始控制方式为手动控制
         *       3.设置PID控制器手动控制输出比例为0
         * 返回:
         *       true  - 成功连接所有接口
         *       false - 至少有一个接口连接失败
         */
        public bool EstablishConnection()
        {
            _pidClient.Connect(_pidPort,ModbusEndianness.BigEndian);
            if (_pidClient.IsConnected) {
                if(SendPidModuleCmd(OperationType.Write, 0x0000, Convert.ToUInt16(Temperature * 10)).Item1
                    && SetOutputPower(0)
                    && SwitchToManual())
                {
                    return true;
                }                
            }
            return false;
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
         * 功能: 同步所有写指令
         * 参数:
         *       type    - 操作类型
         *       address - 寄存器地址
         *       value   - 要写入指定地址的值
         * 返回:
         *       (bool,ushort) - 操作成功则返回true以及获取的结果值(仅限读操作)
         */
        public (bool,ushort) SendPidModuleCmd(OperationType type, ushort address, ushort value)
        {
            bool ret = false;
            ushort data = 0;
            lock (this)
            {
                try {
                    if (_pidClient.IsConnected) {
                        if(type == OperationType.Write) {
                            _pidClient.WriteSingleRegister(_unitIdentifier, address, value);
                            ret = true;
                        } else if (type == OperationType.Read) {
                            data = _pidClient.ReadHoldingRegisters<ushort>(_unitIdentifier, address, 1)[0];
                            ret = true;
                        }                        
                    }
                } catch (TimeoutException) {
                    ret = false;
                    data = 0;
                } catch(ModbusException) {
                    ret = false;
                    data = 0;
                }
                return (ret, data);
            }
        }

        /*
         * 功能: 开始加热,按温度阶段调整输出功率
         */
        public bool StartHeating()
        {
            bool ret = false;
            //根据当前温度阶段设置起始加热功率(软起动),当温度达到745℃时切换至PID控温
            ushort curTemp = GetCurrentTemp();
            if (curTemp < 3000) {
                ret = SetOutputPower(7680) && SwitchToManual();  // 30%输出功率
            } else if (curTemp < 5000) {
                ret = SetOutputPower(12800) && SwitchToManual(); // 50%输出功率
            } else if(curTemp < 6000)  {
                ret = SetOutputPower(17920) && SwitchToManual(); // 70%输出功率
            } else if (curTemp < 7000) {
                ret = SetOutputPower(23040) && SwitchToManual();  // 90%输出功率
            } else {
                ret = SwitchToPID(); // 以目标控制温度执行PID控温
            }
            return ret;
        }

        /*
         * 功能: 停止加热(切断炉体供电)
         */
        public bool StopHeating()
        {
            bool ret = false;
            /* 停止PID温控器输出 */
            //设置手动控制时输出比例为0并切换PID控制器为手动模式
            ret = SetOutputPower(0) && SwitchToManual();
            if (ret)
            {
                _currentOutput = 0xFFFF;
            }
            return ret;
        }

        /*
         * 功能: 将当前加热方式切换至PID方式
         */
        public bool SwitchToPID()
        {            
            if(apparatusStatus == ApparatusStatus.Pid) 
                return true;
            //设置PID温控器工作方式为Auto,目标温度为750℃            
            var (ret, data) = SendPidModuleCmd(OperationType.Write, 0x0038, 4);
            if (ret)
            {
                apparatusStatus = ApparatusStatus.Pid;
            }
            return ret;
        }

        /*
         * 功能: 将PID控制器切换至手动控制模式
         */
        public bool SwitchToManual()
        {
            if (apparatusStatus == ApparatusStatus.Manual)
                return true;         
            var (ret, data) = SendPidModuleCmd(OperationType.Write, 0x0038, 3);
            if(ret)
            {
                apparatusStatus = ApparatusStatus.Manual;
            }
            return ret;
        }        

        /*
         * 功能: 设置当前控制输出比例(手动方式)(0-25600 对应 0%-100%)
         * 参数:
         *       value - 要设定为的输出比例
         */
        public bool SetOutputPower(ushort value)
        {
            if (_currentOutput == value)
                return true;
            var (ret, data) = SendPidModuleCmd(OperationType.Write, 0x0002, value);
            if(ret)
            {
                _currentOutput = value;
            }
            return ret;
        }

        /*
         * 功能: 获取当前控制输出比例(手动方式)
         */
        public ushort GetCurrentOutput()
        {
            return _currentOutput;
        }

        /*
         * 功能: 获取当前控制输出比例(PID方式)
         */
        public ushort GetPidOutput()
        {
            var (ret, data) = SendPidModuleCmd(OperationType.Read, 0x0101, 0);
            if (ret)
            {
                _pidOutput = data;
            }
            return _pidOutput;
        }

        /*
         * 功能: 获取控温热电偶当前温度值
         */
        public ushort GetCurrentTemp()
        {
            var (ret, data) = SendPidModuleCmd(OperationType.Read, 0x0102, 0);
            if(ret)
            {
                _currentTemp = data;
            }
            return _currentTemp;
        }
    }
}