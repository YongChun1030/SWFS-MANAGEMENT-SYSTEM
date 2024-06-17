import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

interface Feedback {
    time: string;
    washroom: string;
    rating: number;
}

interface Usage {
    washroom: string;
    totalUsage: number;
}

interface Notification {
    id: string;
    description: string;
    floor: string;
    toiletType: string;
    timestamp: string;
    read: boolean;
}

const Home: React.FC = () => {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [usages, setUsages] = useState<Usage[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
    const [showNotifications, setShowNotifications] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);
    const navigate = useNavigate();

    const fetchData = async () => {
        try {
            const feedbackResponse = await fetch('http://localhost:5000/feedbacks');
            const feedbackData = await feedbackResponse.json();
            setFeedbacks(feedbackData);

            const usageResponse = await fetch('http://localhost:5000/usages');
            const usageData = await usageResponse.json();
            setUsages(usageData);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    const fetchNotifications = async () => {
        try {
            const notificationResponse = await fetch('http://localhost:5000/notifications');
            const notificationData = await notificationResponse.json();
            setNotifications(notificationData);
            setHasUnread(notificationData.some((notification: Notification) => !notification.read));
        } catch (error) {
            console.error("Error fetching notifications:", error);
        }
    };

    useEffect(() => {
        fetchData();  // Initial fetch
        fetchNotifications(); // Initial fetch of notifications

        const interval = setInterval(() => {
            fetchData();  // Fetch data every 5 seconds (or any interval you need)
            fetchNotifications(); // Fetch notifications every 5 seconds (or any interval you need)
        }, 5000);

        return () => clearInterval(interval);  // Clear interval on component unmount
    }, []);

    useEffect(() => {
        const timeInterval = setInterval(() => {
            setCurrentTime(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
        }, 1000);

        return () => clearInterval(timeInterval);  // Clear interval on component unmount
    }, []);

    const handleLogout = () => {
        navigate('/');
    };

    const handleMonitorClick = () => {
        navigate('/monitor');
    };

    const handleReportClick = () => {
        navigate('/report');
    };

    const handleNotificationClick = () => {
        setShowNotifications(!showNotifications);
        if (hasUnread) {
            // Mark notifications as read
            const updatedNotifications = notifications.map(notification => ({
                ...notification,
                read: true,
            }));
            setNotifications(updatedNotifications);
            setHasUnread(false);

            // Optionally, send a request to the backend to mark notifications as read
            fetch('http://localhost:5000/mark-notifications-read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ids: notifications.map(n => n.id) }),
            });
        }
    };

    const renderNotifications = () => {
        const unreadNotifications = notifications.filter(n => !n.read);
        const readNotifications = notifications.filter(n => n.read).slice(0, 5);
        const displayedNotifications = unreadNotifications.length > 0 ? unreadNotifications : readNotifications;

        return (
            <div className="notification-dropdown">
                <h3>Notifications</h3>
                {displayedNotifications.length > 0 ? (
                    <ul>
                        {displayedNotifications.map((notification, index) => (
                            <li key={index}>
                                {notification.description} at {notification.floor} {notification.toiletType}, {notification.timestamp}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>No new notifications</p>
                )}
            </div>
        );
    };

    return (
        <div className="home-container">
            <header className="header">
                <button className="home-button" onClick={() => navigate('/home')}>
                    <i className="fas fa-home"></i> HOME
                </button>
                <div>
                    <h1>SMART WASHROOM FEEDBACK SYSTEM - HOME</h1>
                    <div className="date-time">{currentTime}</div>
                </div>
                <button onClick={handleLogout} className="btn btn-link logout-button">
                        <i className="fas fa-sign-out-alt"></i> LOG OUT
                </button>
                <div className="header-right">
                    <button onClick={handleNotificationClick} className="btn btn-link notification-button">
                        <i className="fas fa-bell"></i>
                        {hasUnread && <span className="notification-dot"></span>}
                    </button>
                    {showNotifications && renderNotifications()}
                </div>
            </header>
            <div className="content">
                <section className="feedback-section">
                    <h2>LATEST FEEDBACK</h2>
                    <table className="feedback-table">
                        <thead>
                            <tr>
                                <th>TIME</th>
                                <th>WASHROOM</th>
                                <th>RATING</th>
                            </tr>
                        </thead>
                        <tbody>
                            {feedbacks.map((feedback, index) => (
                                <tr key={index}>
                                    <td>{feedback.time}</td>
                                    <td>{feedback.washroom}</td>
                                    <td>{feedback.rating}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
                <section className="usage-section">
                    <h2>TOP 3 WASHROOMS USAGE</h2>
                    <table className="usage-table">
                        <thead>
                            <tr>
                                <th>WASHROOM</th>
                                <th>TOTAL USAGE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usages.map((usage, index) => (
                                <tr key={index}>
                                    <td>{usage.washroom}</td>
                                    <td>{usage.totalUsage}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            </div>
            <div className="monitor-report-buttons">
                <button className="monitor-button" onClick={handleMonitorClick}>
                    <h3>MONITOR...</h3>
                    <p>MONITOR THE CLEANLINESS AND CONDITION OF THE TOILET FACILITY IN REAL-TIME.</p>
                </button>
                <button className="report-button" onClick={handleReportClick}>
                    <h3>REPORT...</h3>
                    <p>VIEW DETAILED REPORTS AND ANALYTICS BASED ON THE FEEDBACK COLLECTED FROM USERS.</p>
                </button>
            </div>
        </div>
    );
};

export default Home;