using System;
using System.Collections.Generic;
using ISO11820_2020.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using TestServer.Models;

namespace TestServer.Models
{
    public partial class ISO11820DbContext : DbContext
    {
        public ISO11820DbContext()
        {
        }

        public ISO11820DbContext(DbContextOptions<ISO11820DbContext> options)
            : base(options)
        {
        }

        public virtual DbSet<Apparatus> Apparatuses { get; set; }
        public virtual DbSet<Operator> Operators { get; set; }
        public virtual DbSet<Productmaster> Productmasters { get; set; }
        public virtual DbSet<Testmaster> Testmasters { get; set; }
        public virtual DbSet<Sensor> Sensors { get; set; } = null!;
        public virtual DbSet<ViewTestInfo> ViewTestInfos { get; set; }

        //protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        //{
        //    if (!optionsBuilder.IsConfigured)
        //    {
        //        optionsBuilder.UseSqlServer("Server=.;Database=ISO11820;Trusted_Connection=yes;");
        //    }
        //}

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Testmaster>(entity =>
            {
                entity.HasKey(e => new { e.Productid, e.Testid });

                entity.Property(e => e.Deltatf).HasComment("[判定项]本次试验样品的最终温升");

                entity.Property(e => e.LostweightPer).HasComment("[判定项]样品质量失重率");

                entity.HasOne(d => d.Product)
                    .WithMany(p => p.Testmasters)
                    .HasForeignKey(d => d.Productid)
                    .OnDelete(DeleteBehavior.ClientSetNull)
                    .HasConstraintName("FK_testmaster_productmaster");
            });

            modelBuilder.Entity<Sensor>(entity =>
            {
                entity.Property(e => e.Sensorid).ValueGeneratedNever();
            });

            modelBuilder.Entity<ViewTestInfo>(entity =>
            {
                entity.ToView("View_TestInfo");
            });

            OnModelCreatingPartial(modelBuilder);
        }

        partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
    }
}
