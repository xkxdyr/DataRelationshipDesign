/*
 Navicat Premium Data Transfer

 Source Server         : root
 Source Server Type    : MySQL
 Source Server Version : 80400
 Source Host           : localhost:3306
 Source Schema         : xinghe_xmy_ljq

 Target Server Type    : MySQL
 Target Server Version : 80400
 File Encoding         : 65001

 Date: 03/05/2025 15:32:09
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for box_xmy_ljq
-- ----------------------------
DROP TABLE IF EXISTS `box_xmy_ljq`;
CREATE TABLE `box_xmy_ljq`  (
  `id_xmy_ljq` int NOT NULL AUTO_INCREMENT COMMENT '盒子id',
  `ref_xmy_ljq` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `warehouse_id_xmy_ljq` int NOT NULL COMMENT '所属仓库id',
  `type_xmy_ljq` tinyint NOT NULL,
  `goods_id_xmy_ljq` int NULL DEFAULT NULL COMMENT '物品id',
  `status_xmy_ljq` enum('0','1','2') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '存储状态,存储0,空闲1,维修2',
  `camera_link_xmy_ljq` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `camera_status_xmy_ljq` tinyint NOT NULL,
  PRIMARY KEY (`id_xmy_ljq`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '盒子信息表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for evaluate_xmy_ljq
-- ----------------------------
DROP TABLE IF EXISTS `evaluate_xmy_ljq`;
CREATE TABLE `evaluate_xmy_ljq`  (
  `user_id_xmy_ljq` int NOT NULL COMMENT '用户id',
  `store_id_xmy_ljq` int NOT NULL COMMENT '商家id',
  `score_xmy_ljq` decimal(38, 2) NOT NULL,
  `evaluate_label_xmy_ljq` enum('0','1','2') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '评论标签,表扬0,批评1,建议2',
  `pics_xmy_ljq` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `content_xmy_ljq` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  PRIMARY KEY (`user_id_xmy_ljq`, `store_id_xmy_ljq`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '评论信息表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for goods_xmy_ljq
-- ----------------------------
DROP TABLE IF EXISTS `goods_xmy_ljq`;
CREATE TABLE `goods_xmy_ljq`  (
  `id_xmy_ljq` int NOT NULL AUTO_INCREMENT COMMENT '物品id',
  `name_xmy_ljq` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `tracking_code_xmy_ljq` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `create_time_xmy_ljq` timestamp NULL DEFAULT NULL COMMENT '创建时间',
  `status_xmy_ljq` enum('0','1','2') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '物品状态,已存储0,在途1,不可用2',
  `model_specifications_xmy_ljq` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `goods_type_xmy_ljq` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `user_id_xmy_ljq` int NOT NULL COMMENT '属于用户id',
  `hold_user_id_xmy_ljq` int NULL DEFAULT NULL COMMENT '持有用户id',
  `warehouse_id_xmy_ljq` int NULL DEFAULT NULL COMMENT '所在仓库id',
  `box_id_xmy_ljq` int NULL DEFAULT NULL COMMENT '所在盒子id',
  PRIMARY KEY (`id_xmy_ljq`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '物品信息表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for group_set
-- ----------------------------
DROP TABLE IF EXISTS `group_set`;
CREATE TABLE `group_set`  (
  `id_xmy_ljq` int NOT NULL AUTO_INCREMENT COMMENT '群聊id',
  `name_xmy_ljq` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '群组名称',
  `registration_time_xmy_ljq` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '群组名称',
  PRIMARY KEY (`id_xmy_ljq`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for order_xmy_ljq
-- ----------------------------
DROP TABLE IF EXISTS `order_xmy_ljq`;
CREATE TABLE `order_xmy_ljq`  (
  `id_xmy_ljq` int NOT NULL AUTO_INCREMENT COMMENT '订单id',
  `status_xmy_ljq` enum('0','1','2','3') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '订单状态,待支付0,已支付1,已完成2,已取消3',
  `create_time_xmy_ljq` timestamp NULL DEFAULT NULL COMMENT '订单创建时间',
  `payment_time_xmy_ljq` timestamp NULL DEFAULT NULL COMMENT '订单支付时间',
  `over_time_xmy_ljq` timestamp NULL DEFAULT NULL COMMENT '订单结束时间',
  `deposit_time_xmy_ljq` timestamp NULL DEFAULT NULL COMMENT '存入时间',
  `retrieve_time_xmy_ljq` timestamp NULL DEFAULT NULL COMMENT '取出时间',
  `refund_time_xmy_ljq` timestamp NULL DEFAULT NULL COMMENT '订单退款时间',
  `store_id_xmy_ljq` int NOT NULL COMMENT '订单商家id',
  `goods_id_xmy_ljq` int NULL DEFAULT NULL COMMENT '物品id',
  `user_id_xmy_ljq` int NOT NULL COMMENT '用户id',
  `order_types_xmy_ljq` enum('0','1') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '订单类型,单寄存0,运动寄存1',
  `store_away_time_xmy_ljq` int NULL DEFAULT 0 COMMENT '存储时长',
  `store_away_money_xmy_ljq` decimal(38, 2) NULL DEFAULT NULL,
  `move_away_money_xmy_ljq` decimal(38, 2) NULL DEFAULT NULL,
  `play_money_xmy_ljq` decimal(38, 2) NULL DEFAULT NULL,
  `pick_up_code_xmy_ljq` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  PRIMARY KEY (`id_xmy_ljq`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '订单信息表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for store_xmy_ljq
-- ----------------------------
DROP TABLE IF EXISTS `store_xmy_ljq`;
CREATE TABLE `store_xmy_ljq`  (
  `id_xmy_ljq` int NOT NULL AUTO_INCREMENT COMMENT '主键，唯一ID，自动增长',
  `name_xmy_ljq` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `cover_xmy_ljq` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '封面图片URL',
  `belong_user_id_xmy_ljq` int NOT NULL COMMENT '属于用户id',
  `address_xmy_ljq` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '站点地址',
  `registration_time_xmy_ljq` timestamp NULL DEFAULT NULL COMMENT '注册时间',
  `status_xmy_ljq` enum('0','1') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '1' COMMENT '营业状态：0-关闭, 1-营业中',
  `warehouse_capacity_xmy_ljq` int NULL DEFAULT 0 COMMENT '仓库容量',
  `free_capacity_xmy_ljq` int NULL DEFAULT 0 COMMENT '空闲容量',
  `score_xmy_ljq` decimal(38, 2) NULL DEFAULT NULL,
  `description_xmy_ljq` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `registation_time_xmy_ljq` datetime(6) NULL DEFAULT NULL,
  PRIMARY KEY (`id_xmy_ljq`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '商家信息表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for user_xmy_ljq
-- ----------------------------
DROP TABLE IF EXISTS `user_xmy_ljq`;
CREATE TABLE `user_xmy_ljq`  (
  `id_xmy_ljq` int NOT NULL AUTO_INCREMENT,
  `address_xmy_ljq` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `avatar_xmy_ljq` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `balance_xmy_ljq` decimal(38, 2) NULL DEFAULT NULL,
  `customer_type_xmy_ljq` tinyint NOT NULL,
  `email_xmy_ljq` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `id_card_xmy_ljq` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `last_login_time_xmy_ljq` datetime(6) NULL DEFAULT NULL,
  `movement_rate_xmy_ljq` decimal(38, 2) NULL DEFAULT NULL,
  `nickname_xmy_ljq` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `password_xmy_ljq` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `phone_xmy_ljq` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `registation_time_xmy_ljq` datetime(6) NULL DEFAULT NULL,
  `status_xmy_ljq` tinyint NOT NULL,
  `storage_rate_xmy_ljq` decimal(38, 2) NULL DEFAULT NULL,
  `store_id_xmy_ljq` int NULL DEFAULT NULL,
  `user_level_xmy_ljq` smallint NULL DEFAULT NULL,
  `username_xmy_ljq` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `warehouse_id_xmy_ljq` int NULL DEFAULT NULL,
  `registration_time_xmy_ljq` datetime(6) NULL DEFAULT NULL,
  PRIMARY KEY (`id_xmy_ljq`) USING BTREE,
  UNIQUE INDEX `UK65i4ahe152ev6xnxon37xcoxh`(`username_xmy_ljq` ASC) USING BTREE,
  CONSTRAINT `user_xmy_ljq_chk_1` CHECK (`customer_type_xmy_ljq` between 0 and 3),
  CONSTRAINT `user_xmy_ljq_chk_2` CHECK (`status_xmy_ljq` between 0 and 1)
) ENGINE = InnoDB AUTO_INCREMENT = 10 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for warehouse_xmy_ljq
-- ----------------------------
DROP TABLE IF EXISTS `warehouse_xmy_ljq`;
CREATE TABLE `warehouse_xmy_ljq`  (
  `id_xmy_ljq` int NOT NULL AUTO_INCREMENT COMMENT '物品id',
  `name_xmy_ljq` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `create_time_xmy_ljq` timestamp NULL DEFAULT NULL COMMENT '创建时间',
  `status_xmy_ljq` enum('0','1','2') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '仓库状态，开启0,关闭1,维修2',
  `model_specifications_xmy_ljq` int NULL DEFAULT 0 COMMENT '仓库容量',
  `type_xmy_ljq` enum('0','1','2') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '仓库类型,大件仓库0,小件仓库1,混合仓库2',
  `user_id_xmy_ljq` int NULL DEFAULT NULL COMMENT '属于用户id',
  `related_merchant_ids_xmy_ljq` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `address_xmy_ljq` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '厂库地址',
  `big_box_capacity_xmy_ljq` int NULL DEFAULT 0 COMMENT '大件容量',
  `small_box_capacity_xmy_ljq` int NULL DEFAULT 0 COMMENT '小件容量',
  `free_big_box_capacity_xmy_ljq` int NULL DEFAULT 0 COMMENT '空闲大件容量',
  `free_small_box_capacity_xmy_ljq` int NULL DEFAULT 0 COMMENT '空闲小件容量',
  PRIMARY KEY (`id_xmy_ljq`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '物品信息表' ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;
