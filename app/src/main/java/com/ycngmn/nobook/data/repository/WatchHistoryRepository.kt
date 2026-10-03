package com.ycngmn.nobook.data.repository

import com.ycngmn.nobook.data.local.dao.WatchHistoryDao
import com.ycngmn.nobook.data.local.entity.WatchHistory
import kotlinx.coroutines.flow.Flow

class WatchHistoryRepository(private val dao: WatchHistoryDao) {
    suspend fun addWatch(url: String, title: String?, thumbnail: String?) {
        dao.insert(WatchHistory(url = url, title = title, thumbnail = thumbnail))
    }

    fun getRecentHistory(limit: Int = 50): Flow<List<WatchHistory>> {
        return dao.getRecentHistory(limit)
    }

    suspend fun getLastWatchForUrl(url: String): WatchHistory? {
        return dao.getLastWatchForUrl(url)
    }

    suspend fun removeFromHistory(id: Long) {
        dao.deleteById(id)
    }

    suspend fun clearAllHistory() {
        dao.deleteAll()
    }

    fun getHistoryCount(): Flow<Int> {
        return dao.getCount()
    }
}
