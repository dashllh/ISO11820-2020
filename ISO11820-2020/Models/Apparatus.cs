using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace TestServer.Models
{
    [Keyless]
    [Table("apparatus")]
    public partial class Apparatus
    {
        [Required]
        [Column("apparatusid")]
        [StringLength(128)]
        [Unicode(false)]
        public string Apparatusid { get; set; }
        [Required]
        [Column("apparatusname")]
        [StringLength(512)]
        [Unicode(false)]
        public string Apparatusname { get; set; }
        [Column("checkdate", TypeName = "date")]
        public DateTime? Checkdate { get; set; }
        [Required]
        [Column("port")]
        [StringLength(128)]
        [Unicode(false)]
        public string Port { get; set; }
        [Column("constpower")]
        public int Constpower { get; set; }
    }
}
