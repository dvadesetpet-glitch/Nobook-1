package com.ycngmn.nobook.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "watch_history")
data class WatchHistory(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val url: String,
    val title: String?,
    val thumbnail: String?,
    val watchedAt: Long = System.currentTimeMillis()
)
