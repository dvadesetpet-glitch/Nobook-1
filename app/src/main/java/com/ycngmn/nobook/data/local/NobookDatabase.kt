package com.ycngmn.nobook.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.ycngmn.nobook.data.local.dao.AccountDao
import com.ycngmn.nobook.data.local.dao.WatchHistoryDao
import com.ycngmn.nobook.data.local.entity.Account
import com.ycngmn.nobook.data.local.entity.WatchHistory

@Database(
    entities = [WatchHistory::class, Account::class],
    version = 1,
    exportSchema = false
)
abstract class NobookDatabase : RoomDatabase() {
    abstract fun watchHistoryDao(): WatchHistoryDao
    abstract fun accountDao(): AccountDao

    companion object {
        @Volatile
        private var INSTANCE: NobookDatabase? = null

        fun getDatabase(context: Context): NobookDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    NobookDatabase::class.java,
                    "nobook_database"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
