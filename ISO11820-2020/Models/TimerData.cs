namespace TestServer.Models
{
    /* 定义用于SignalR通信的实时数据类型 */
    public class TimerData
    {
        //当前消息所属的试验控制器ID
        public int MasterId { get; set; } = 0;
        //当前消息的试验计时
        public int Timer { get; set; } = 0;
        //环境温度
        public double? AmbTemp { get; set; } = 0.0;
        //室内温度
        public double? HouseTemp { get; set; } = 0.0;
    }
}
