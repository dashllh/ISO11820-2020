namespace TestServer.Core
{
    public interface ITestMaster
    {
        /* 新建试验任务 */
        public void CreateTest();
        /* 新建系统标定任务 */
        public void CreateCalibration();
        /* 开始记录数据 */
        public void StartRecording();
        /* 停止记录数据 */
        public void StopRecording();
        /* 记录试验现象 */
        public void UpdatePhenomenon(string phenocode, string memo);
        /* 输出试验采集数据 */
        public void GenerateCSV(string filepath);
        /* 生成试验报表 */
        public void GenerateTestReport(string filepath);

        /* 判断试验条件是否满足的函数 */
        public bool CheckStartCriteria();

        /* 判断试验是否满足终止条件的函数 */
        public bool CheckTerminateCriteria();

        /* 试验控制器事件函数 */

        //初始化完成后需要执行的操作
        public void OnInitialized();
    }
}
