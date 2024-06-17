import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Monitor.css';

interface Configuration {
    toiletType: string;
    floor: string;
    id: string;
}

interface Problem {
    description: string;
    toiletType: string;
    floor: string;
    timestamp: string;
    solved: boolean;
    id: string;
}

interface Usage {
    washroom: string;
    totalUsage: number;
}

interface WashroomStats {
    floor: string;
    toiletType: string;
    totalFeedback: number;
    overallRating: string;
}

const LoadingModal: React.FC = () => (
    <div className="loading-modal">
        <div className="loading-spinner"></div>
        <p>Sending message...</p>
    </div>
);

const Monitor: React.FC = () => {
    const [configurations, setConfigurations] = useState<Configuration[]>([]);
    const [problems, setProblems] = useState<Problem[]>([]);
    const [usages, setUsages] = useState<Usage[]>([]);
    const [washroomStats, setWashroomStats] = useState<WashroomStats[]>([]);
    const [selectedType, setSelectedType] = useState<string>('male');
    const [currentTime, setCurrentTime] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const configResponse = await fetch('http://localhost:5000/configurations');
                const configData = await configResponse.json();
                console.log("Configurations Data:", configData); // Log configurations data
                setConfigurations(configData);

                const problemResponse = await fetch('http://localhost:5000/problems');
                const problemData = await problemResponse.json();
                console.log("Problems Data:", problemData); // Log problems data
                setProblems(problemData);

                const usageResponse = await fetch('http://localhost:5000/all-usages');
                const usageData = await usageResponse.json();
                console.log("Usage Data:", usageData); // Log usage data
                setUsages(usageData);

                const statsResponse = await fetch('http://localhost:5000/washroom-stats');
                const statsData = await statsResponse.json();
                console.log("Washroom Stats Data:", statsData); // Log washroom stats data
                setWashroomStats(statsData);
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        const updateTime = () => {
            setCurrentTime(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
        };
        updateTime();
        const intervalId = setInterval(updateTime, 1000);
        return () => clearInterval(intervalId);
    }, []);

    const handleTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedType(event.target.value);
    };

    const sendActionMessage = async (message: string) => {
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:5000/send-action-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });
            const data = await response.json();
            if (data.success) {
                alert('Message sent successfully');
            } else {
                alert('Failed to send message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Error sending message');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredConfigurations = configurations
        .filter(config => config.toiletType === selectedType)
        .sort((a, b) => a.floor.localeCompare(b.floor));
    const filteredProblems = problems.filter(problem => problem.toiletType === selectedType);
    const filteredUsages = usages.filter(usage => usage.washroom.split(' ')[1] === selectedType);
    const filteredStats = washroomStats.filter(stat => stat.toiletType === selectedType);

    return (
        <div className="monitor-container">
            {isLoading && <LoadingModal />}
            <header>
                <button className="home-button" onClick={() => navigate('/home')}>
                    <i className="fas fa-home"></i> HOME
                </button>
                <div>
                    <h1>SMART WASHROOM FEEDBACK SYSTEM - MONITORING</h1>
                    <div className="date-time">{currentTime}</div>
                </div>
                <button onClick={() => navigate('/')} className="btn btn-link logout-button">
                    <i className="fas fa-sign-out-alt"></i> LOG OUT
                </button>
            </header>
            <div className="content">
                <section className="monitor-section">
                    <div className="dropdown">
                        <label htmlFor="toiletType">Toilet Type:</label>
                        <select id="toiletType" value={selectedType} onChange={handleTypeChange}>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="oku">OKU</option>
                        </select>
                    </div>
                    <table className="monitor-table">
                        <thead>
                            <tr>
                                <th>WASHROOM</th>
                                <th>TOTAL USAGE</th>
                                <th>TOTAL FEEDBACK</th>
                                <th>OVERALL RATING</th>
                                <th>CONDITIONS</th>
                                <th>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredConfigurations.map((config, index) => {
                                const washroomId = `${config.floor} ${config.toiletType}`;
                                const usage = filteredUsages.find(usage => usage.washroom === washroomId);
                                const totalUsage = usage ? usage.totalUsage : 0;
                                console.log(`Config: ${washroomId}, Usage: ${usage ? usage.totalUsage : 'No usage'}`);
                                const statsForConfig = filteredStats.find(stat => stat.floor === config.floor && stat.toiletType === config.toiletType) || { totalFeedback: 0, overallRating: '-' };
                                const problemsForConfig = filteredProblems.filter(problem => problem.floor === config.floor && problem.toiletType === config.toiletType && !problem.solved);
                                console.log(`Problems for ${washroomId}:`, problemsForConfig);
                                const conditions = problemsForConfig.map(problem => problem.description).join(', ') || 'Everything is good.';

                                const actionMessage = `Hey ${config.toiletType} ${config.floor} has the following issues: ${conditions}. Please take action ASAP.`;

                                return (
                                    <tr key={index}>
                                        <td>{config.floor}</td>
                                        <td>{totalUsage}</td>
                                        <td>{statsForConfig.totalFeedback}</td>
                                        <td>{statsForConfig.overallRating}/5</td>
                                        <td>{conditions}</td>
                                        <td>
                                            <button onClick={() => sendActionMessage(actionMessage)} disabled={isLoading}>
                                                Send Message
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </section>
            </div>
        </div>
    );
};

export default Monitor;
