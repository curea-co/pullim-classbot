import { Exclude, Expose } from "class-transformer";
import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * 모든 엔티티의 공통 베이스. 본체 pullim BaseModel 정렬.
 * uuid PK + created/updated/deletedAt(soft delete).
 * 본체는 luxon DateTime + transformer 를 쓰지만, classbot 핵심 범위는 네이티브 Date 로 단순화한다.
 */
export abstract class BaseModel {
  @PrimaryGeneratedColumn("uuid")
  @Expose()
  id: string;

  @CreateDateColumn({ type: "timestamptz" })
  @Expose()
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  @Expose()
  updatedAt: Date;

  @DeleteDateColumn({ type: "timestamptz", nullable: true })
  @Exclude({ toPlainOnly: true })
  deletedAt: Date | null;
}
