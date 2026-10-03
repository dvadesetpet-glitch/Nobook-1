package com.ycngmn.nobook.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.Query
import com.ycngmn.nobook.data.local.entity.WatchHistory
import kotlinx.coroutines.flow.Flow

@Dao
interface WatchHistoryDao {
    @Insert
    suspend fun insert(watchHistory: WatchHistory): Long

    @Query("SELECT * FROM watch_history ORDER BY watchedAt DESC LIMIT :limit")
    fun getRecentHistory(limit: Int = 50): Flow<List<WatchHistory>>

    @Query("SELECT * FROM watch_history WHERE url = :url ORDER BY watchedAt DESC LIMIT 1")
    suspend fun getLastWatchForUrl(url: String): WatchHistory?

    @Delete
    suspend fun delete(watchHistory: WatchHistory)

    @Query("DELETE FROM watch_history WHERE id = :id")
    suspend fun deleteById(id: Long)

    @Query("DELETE FROM watch_history")
    suspend fun deleteAll()

    @Query("SELECT COUNT(*) FROM watch_history")
    fun getCount(): Flow<Int>
}
