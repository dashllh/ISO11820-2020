using TestServer.Models;
using TestServer.Core;
using Microsoft.EntityFrameworkCore.Internal;
using Microsoft.Office.Interop.Excel;
using Microsoft.EntityFrameworkCore;

namespace TestServer.Global
{
    public class AppGlobal
    {
        //数据库上下文对象
        private readonly IDbContextFactory<ISO11820DbContext> _contextFactory;
        //具有多台试验控制器的情况
        //public Dictionary<int, TestMaster>? TestMasters { get; set; }

        //试验设备信息全局缓存
        public Dictionary<int, Apparatus> DictApparatus { get; set; }

        //构造函数
        public AppGlobal(IDbContextFactory<ISO11820DbContext> contextFactory)
        {
            _contextFactory = contextFactory;
            DictApparatus = new Dictionary<int, Apparatus>();
            //添加四个试验设备对象至全局缓存
            var ctx = _contextFactory.CreateDbContext();
            DictApparatus = ctx.Apparatuses.ToDictionary(x => x.Apparatusid);
        }
    }
}
